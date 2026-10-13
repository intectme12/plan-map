import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import { ForbiddenError, PayloadTooLargeError, RateLimitedError } from "../errors";
import { readJsonBody } from "../http";
import { copyTrip, createTrip } from "./trips";
import { assertCanAddPlace, TRIP_LIMITS } from "./tripQuota";

// 실제 DB에 임시 회원을 만들어 확인하고, 끝나면 회원(여행은 cascade)과 그 회원의 제한 카운터를 지운다.
const createdUserIds: string[] = [];

async function tempUser(ageMs: number) {
  const id = randomUUID().replace(/-/g, "").slice(0, 20);
  const user = await prisma.user.create({
    data: {
      email: `quota-test-${id}@example.invalid`,
      nickname: `qt${id}`.slice(0, 20),
      createdAt: new Date(Date.now() - ageMs),
    },
  });
  createdUserIds.push(user.id);
  return user;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const tripInput = (name = "테스트 여행") => ({
  name,
  startDate: new Date("2026-11-01"),
  endDate: new Date("2026-11-02"),
  personnel: 1,
});

after(async () => {
  for (const id of createdUserIds) {
    await prisma.rateLimitCounter.deleteMany({ where: { key: { endsWith: `:${id}` } } });
  }
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

test("가입 24시간 미만 계정은 하루 3개까지만 만들 수 있다", async (t) => {
  t.mock.method(console, "warn", () => {});
  const user = await tempUser(60 * 60 * 1000);
  for (let i = 0; i < 3; i++) {
    const { created } = await createTrip(user, tripInput());
    assert.equal(created, true);
  }
  await assert.rejects(createTrip(user, tripInput()), RateLimitedError);
  assert.equal(await prisma.trip.count({ where: { userId: user.id } }), 3);
});

test("일반 계정은 분당 5개까지, 6번째는 429", async (t) => {
  t.mock.method(console, "warn", () => {});
  const user = await tempUser(2 * DAY_MS);
  for (let i = 0; i < 5; i++) await createTrip(user, tripInput());
  await assert.rejects(createTrip(user, tripInput()), (err) => {
    assert.ok(err instanceof RateLimitedError);
    assert.ok(err.retryAfterSec >= 1 && err.retryAfterSec <= 60);
    return true;
  });
});

test("같은 Idempotency-Key로 다시 보내면 새로 만들지 않고 같은 여행을 돌려주며, 한도도 쓰지 않는다", async (t) => {
  t.mock.method(console, "warn", () => {});
  const user = await tempUser(60 * 60 * 1000); // 신규 계정(하루 3개)이라 키 재사용이 한도를 쓰면 바로 드러남
  const key = randomUUID();
  const first = await createTrip(user, tripInput(), key);
  assert.equal(first.created, true);
  for (let i = 0; i < 5; i++) {
    const again = await createTrip(user, tripInput("다른 이름"), key);
    assert.equal(again.created, false);
    assert.equal(again.trip.id, first.trip.id);
  }
  assert.equal(await prisma.trip.count({ where: { userId: user.id } }), 1);
  // 다른 키는 새 여행
  assert.equal((await createTrip(user, tripInput(), randomUUID())).created, true);
});

test("같은 사용자의 동시 생성 요청은 하나만 처리하고 나머지는 429", async (t) => {
  t.mock.method(console, "warn", () => {});
  const user = await tempUser(2 * DAY_MS);
  const key = randomUUID();
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => createTrip(user, tripInput(), key)));
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.ok(rejected.every((r) => r.status === "rejected" && r.reason instanceof RateLimitedError));
  assert.equal(await prisma.trip.count({ where: { userId: user.id } }), 1);
});

// 상한값(300/150)만큼 실제로 만들지 않고, 테스트 동안만 상한을 낮췄다가 되돌린다
async function withLimit<K extends keyof typeof TRIP_LIMITS>(key: K, value: number, fn: () => Promise<void>) {
  const original = TRIP_LIMITS[key];
  TRIP_LIMITS[key] = value;
  try {
    await fn();
  } finally {
    TRIP_LIMITS[key] = original;
  }
}

test("보유 여행이 상한에 닿으면 생성·복사 모두 403", async () => {
  const user = await tempUser(2 * DAY_MS);
  const source = await prisma.trip.create({ data: { ...tripInput("공개 원본"), userId: user.id, visibility: "PUBLIC" } });
  await withLimit("maxOwnedTrips", 1, async () => {
    await assert.rejects(createTrip(user, tripInput()), ForbiddenError);
    await assert.rejects(copyTrip(user, source.id), ForbiddenError);
  });
  assert.equal(await prisma.trip.count({ where: { userId: user.id } }), 1);
});

test("신규 계정 복사는 하루 2번, 비공개 여행은 복사 불가", async (t) => {
  t.mock.method(console, "warn", () => {});
  const owner = await tempUser(2 * DAY_MS);
  const copier = await tempUser(60 * 60 * 1000);
  const pub = await prisma.trip.create({ data: { ...tripInput("공개"), userId: owner.id, visibility: "PUBLIC" } });
  const priv = await prisma.trip.create({ data: { ...tripInput("비공개"), userId: owner.id } });

  await assert.rejects(copyTrip(copier, priv.id), /찾을 수 없습니다/);
  await copyTrip(copier, pub.id);
  await copyTrip(copier, pub.id);
  await assert.rejects(copyTrip(copier, pub.id), RateLimitedError);
  assert.equal(await prisma.trip.count({ where: { userId: copier.id } }), 2);
});

test("여행당 장소 수 상한에 닿으면 장소 추가 403", async () => {
  const user = await tempUser(2 * DAY_MS);
  const trip = await prisma.trip.create({ data: { ...tripInput(), userId: user.id } });
  await prisma.placeEntry.create({ data: { tripId: trip.id, order: 1, name: "장소", lat: 37.5, lng: 127 } });
  await assertCanAddPlace(user.id, trip.id);
  await withLimit("maxPlacesPerTrip", 1, async () => {
    await assert.rejects(assertCanAddPlace(user.id, trip.id), ForbiddenError);
  });
});

test("요청 본문이 상한보다 크면 413, JSON이 아니면 null", async () => {
  const big = new Request("http://x/", { method: "POST", body: JSON.stringify({ name: "a".repeat(70_000) }) });
  await assert.rejects(readJsonBody(big), PayloadTooLargeError);
  const declared = new Request("http://x/", {
    method: "POST",
    body: "{}",
    headers: { "content-length": "999999" },
  });
  await assert.rejects(readJsonBody(declared), PayloadTooLargeError);
  assert.equal(await readJsonBody(new Request("http://x/", { method: "POST", body: "not json" })), null);
  assert.deepEqual(await readJsonBody(new Request("http://x/", { method: "POST", body: '{"a":1}' })), { a: 1 });
});
