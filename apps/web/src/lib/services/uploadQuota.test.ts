import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import { ForbiddenError, RateLimitedError } from "../errors";
import { withUploadQuota } from "./uploadQuota";
import { addPhoto, MAX_PHOTOS_PER_PLACE } from "./photos";
import { assertRateLimits, RATE_RULES } from "../rateLimit";

// 실제 DB 카운터를 쓰되 임의의 사용자 ID로 세고, 끝나면 그 카운터와 임시 회원을 지운다.
const subjects: string[] = [];
const userIds: string[] = [];
const MB = 1024 * 1024;

after(async () => {
  for (const s of [...subjects, ...userIds]) {
    await prisma.rateLimitCounter.deleteMany({ where: { key: { endsWith: `:${s}` } } });
  }
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

test("하루 업로드 용량을 넘기면 저장하지 않고 429, 저장에 성공한 만큼만 용량을 쓴다", async () => {
  const userId = `upload-test-${randomUUID()}`;
  subjects.push(userId);
  let saved = 0;
  const save = async () => {
    saved += 1;
    return "ok";
  };

  assert.equal(await withUploadQuota(userId, 200 * MB, save), "ok");
  // 저장이 실패하면 용량을 쓰지 않는다
  await assert.rejects(
    withUploadQuota(userId, 90 * MB, async () => {
      throw new Error("disk full");
    }),
    /disk full/
  );
  assert.equal(await withUploadQuota(userId, 90 * MB, save), "ok");
  await assert.rejects(withUploadQuota(userId, 20 * MB, save), (err) => {
    assert.ok(err instanceof RateLimitedError);
    assert.match(err.message, /300MB/);
    return true;
  });
  assert.equal(saved, 2);
});

test("장소 하나에 사진이 상한만큼 있으면 파일을 저장하기 전에 403", async () => {
  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  const user = await prisma.user.create({ data: { email: `photo-test-${id}@example.invalid`, nickname: `pt${id}` } });
  userIds.push(user.id);
  const trip = await prisma.trip.create({
    data: { userId: user.id, name: "t", startDate: new Date("2026-11-01"), endDate: new Date("2026-11-01") },
  });
  const place = await prisma.placeEntry.create({ data: { tripId: trip.id, order: 1, name: "p", lat: 37.5, lng: 127 } });
  await prisma.photo.createMany({
    data: Array.from({ length: MAX_PHOTOS_PER_PLACE }, (_, i) => ({ placeEntryId: place.id, storageKey: `/uploads/none-${i}.png` })),
  });

  const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "a.png", { type: "image/png" });
  await assert.rejects(addPhoto(user.id, trip.id, place.id, png), ForbiddenError);
  assert.equal(await prisma.photo.count({ where: { placeEntryId: place.id } }), MAX_PHOTOS_PER_PLACE);
});

test("메시지 등 쓰기 API도 사용자별 분당 한도가 있다", async (t) => {
  t.mock.method(console, "warn", () => {});
  const userId = `write-test-${randomUUID()}`;
  subjects.push(userId);
  const check = () => assertRateLimits([{ rule: RATE_RULES.conversationCreatePerUserMin, subject: userId }]);
  for (let i = 0; i < RATE_RULES.conversationCreatePerUserMin.limit; i++) await check();
  await assert.rejects(check(), RateLimitedError);
});
