import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import {
  addUsage,
  enforceRateLimits,
  hit,
  KST_OFFSET_SEC,
  remainingBudget,
  type RateRule,
} from "./rateLimit";

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

test("토큰 같은 사용량 예산은 실제 사용량만큼 더하고, 다 쓰면 남은 양이 0 이하가 된다", async () => {
  const r = rule("budget", 100, 24 * 60 * 60);
  assert.equal((await remainingBudget(r, "u")).remaining, 100);
  await addUsage(r, "u", 60);
  assert.equal((await remainingBudget(r, "u")).remaining, 40);
  await addUsage(r, "u", 50.2); // 소수는 올림
  assert.equal((await remainingBudget(r, "u")).remaining, -11);
  await addUsage(r, "u", 0); // 0은 기록 안 함
  assert.equal((await remainingBudget(r, "u")).remaining, -11);
});

test("일일 예산 창은 한국 자정(UTC 15시)에 바뀐다", async () => {
  const r = { ...rule("kst", 10, 24 * 60 * 60), offsetSec: KST_OFFSET_SEC };
  const beforeMidnightKst = Date.parse("2026-10-13T14:59:59Z");
  const afterMidnightKst = Date.parse("2026-10-13T15:00:01Z");
  const a = await hit(r, "s", beforeMidnightKst);
  const b = await hit(r, "s", afterMidnightKst);
  assert.equal(a.expiresAt, Date.parse("2026-10-13T15:00:00Z"));
  assert.equal(a.count, 1);
  assert.equal(b.count, 1, "자정이 지나면 새 창");
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
