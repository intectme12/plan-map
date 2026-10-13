import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { enforceRateLimits, hit, type RateRule } from "./rateLimit";

// 실제 DB(rate_limit_counters)에 붙어서 원자성까지 확인한다. 테스트마다 고유한 규칙 이름을 써서
// 다른 데이터와 섞이지 않게 하고, 끝나면 이번 실행에서 만든 행만 지운다.
const RUN = `test-${randomUUID()}`;
const rule = (name: string, limit: number, windowSec = 600): RateRule => ({ name: `${RUN}:${name}`, limit, windowSec });

after(async () => {
  await prisma.rateLimitCounter.deleteMany({ where: { key: { startsWith: RUN } } });
  await prisma.$disconnect();
});

test("한 사용자가 한도를 넘으면 429용 결과와 Retry-After를 돌려준다", async () => {
  const r = rule("single", 3);
  const now = Date.now();
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(await enforceRateLimits([{ rule: r, subject: "user-a" }], now), { ok: true });
  }
  const denied = await enforceRateLimits([{ rule: r, subject: "user-a" }], now);
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.rule, r.name);
    assert.ok(denied.retryAfterSec >= 1 && denied.retryAfterSec <= r.windowSec);
  }
  // 다른 사용자는 영향 없음
  assert.deepEqual(await enforceRateLimits([{ rule: r, subject: "user-b" }], now), { ok: true });
});

test("여러 계정으로 나눠 보내도 서비스 전체 한도에 걸린다", async () => {
  const perUser = rule("per-user", 100);
  const global = rule("global", 5);
  const now = Date.now();
  const results = [];
  for (let i = 0; i < 8; i++) {
    results.push(
      await enforceRateLimits(
        [
          { rule: perUser, subject: `user-${i}` },
          { rule: global, subject: "all" },
        ],
        now
      )
    );
  }
  assert.equal(results.filter((r) => r.ok).length, 5);
  assert.ok(results.slice(5).every((r) => !r.ok && r.rule === global.name));
});

test("동시에 몰려도 정확히 한도만큼만 통과한다(원자적 카운터)", async () => {
  const r = rule("concurrent", 10);
  const now = Date.now();
  const results = await Promise.all(
    Array.from({ length: 25 }, () => enforceRateLimits([{ rule: r, subject: "burst" }], now))
  );
  assert.equal(results.filter((x) => x.ok).length, 10);
});

test("창이 바뀌면 다시 허용된다", async () => {
  const r = rule("window", 1, 60);
  const windowStart = Math.floor(Date.now() / 60_000) * 60_000;
  assert.equal((await enforceRateLimits([{ rule: r, subject: "w" }], windowStart + 1000)).ok, true);
  assert.equal((await enforceRateLimits([{ rule: r, subject: "w" }], windowStart + 2000)).ok, false);
  assert.equal((await enforceRateLimits([{ rule: r, subject: "w" }], windowStart + 61_000)).ok, true);
});

test("주체를 모르는 규칙(null)은 건너뛴다", async () => {
  const r = rule("null-subject", 0);
  assert.deepEqual(await enforceRateLimits([{ rule: r, subject: null }]), { ok: true });
});

test("카운터 저장소 오류 시엔 막지 않고 통과시킨다(fail-open)", async (t) => {
  // PrismaClient의 $queryRaw는 일반 메서드가 아니라 mock.method로 못 바꿔서, 인스턴스에 직접 덮어썼다가 되돌린다
  const original = Object.getOwnPropertyDescriptor(prisma, "$queryRaw");
  Object.defineProperty(prisma, "$queryRaw", {
    configurable: true,
    value: async () => {
      throw new Error("db down");
    },
  });
  t.mock.method(console, "error", () => {});
  try {
    assert.deepEqual(await enforceRateLimits([{ rule: rule("fail-open", 0), subject: "x" }]), { ok: true });
    await assert.rejects(hit(rule("fail-open-hit", 0), "x"));
  } finally {
    if (original) Object.defineProperty(prisma, "$queryRaw", original);
    else delete (prisma as unknown as Record<string, unknown>).$queryRaw;
  }
});
