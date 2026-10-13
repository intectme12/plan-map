import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { ServiceUnavailableError } from "./errors";
import {
  assertFeatureEnabled,
  clearFeatureFlagCache,
  FEATURES,
  isFeatureDisabled,
  listFeatureStates,
  setFeatureDisabled,
} from "./featureFlags";
import { createTrip, listTrips } from "./services/trips";
import { extractPlaces } from "./services/aiImport";
import { withUploadQuota } from "./services/uploadQuota";

// 실제 feature_flags 테이블을 건드리면 실행 중인 dev 서버(같은 DB)의 기능이 잠깐 꺼질 수 있어서,
// 스위치 저장소(prisma.featureFlag)만 메모리 가짜로 바꾼다. 여행 조회/생성 등 나머지는 실제 DB.
type Row = { key: string; disabled: boolean; reason: string | null; updatedBy: string | null; updatedAt: Date };
const store = new Map<string, Row>();
let failReads = false;
const fakeDelegate = {
  findMany: async (args?: { where?: { disabled?: boolean } }) => {
    if (failReads) throw new Error("db down");
    const rows = [...store.values()];
    return args?.where?.disabled === undefined ? rows : rows.filter((r) => r.disabled === args.where!.disabled);
  },
  upsert: async ({ where, create, update }: { where: { key: string }; create: Row; update: Partial<Row> }) => {
    const prev = store.get(where.key);
    const row = { ...(prev ?? create), ...(prev ? update : {}), updatedAt: new Date() } as Row;
    store.set(where.key, row);
    return row;
  },
};
let original: PropertyDescriptor | undefined;
const userIds: string[] = [];

before(() => {
  original = Object.getOwnPropertyDescriptor(prisma, "featureFlag");
  Object.defineProperty(prisma, "featureFlag", { configurable: true, value: fakeDelegate });
});

after(async () => {
  if (original) Object.defineProperty(prisma, "featureFlag", original);
  else delete (prisma as unknown as Record<string, unknown>).featureFlag;
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  store.clear();
  failReads = false;
  delete process.env.DISABLED_FEATURES;
  clearFeatureFlagCache();
});

test("기본은 모두 켜져 있고, 끄면 그 기능만 503 + 안내 문구", async (t) => {
  t.mock.method(console, "warn", () => {});
  for (const key of Object.keys(FEATURES) as (keyof typeof FEATURES)[]) {
    assert.equal(await isFeatureDisabled(key), false);
  }
  await setFeatureDisabled("aiParse", true, "admin-1", "Groq 비용 급증");
  await assert.rejects(assertFeatureEnabled("aiParse"), (err) => {
    assert.ok(err instanceof ServiceUnavailableError);
    assert.equal(err.message, FEATURES.aiParse.message);
    return true;
  });
  assert.equal(await isFeatureDisabled("tripCreate"), false);

  await setFeatureDisabled("aiParse", false, "admin-1");
  await assertFeatureEnabled("aiParse");
});

test("다른 서버에서 바꾼 값은 30초 캐시가 지나야 반영된다(같은 서버에서 바꾸면 즉시)", async () => {
  assert.equal(await isFeatureDisabled("signup"), false);
  store.set("signup", { key: "signup", disabled: true, reason: null, updatedBy: "x", updatedAt: new Date() });
  assert.equal(await isFeatureDisabled("signup"), false, "캐시된 값");
  clearFeatureFlagCache();
  assert.equal(await isFeatureDisabled("signup"), true);
});

test("상태를 못 읽으면 마지막으로 읽은 상태를 유지한다", async (t) => {
  t.mock.method(console, "error", () => {});
  t.mock.method(console, "warn", () => {});
  await setFeatureDisabled("photoUpload", true, "admin-1");
  assert.equal(await isFeatureDisabled("photoUpload"), true);
  failReads = true;
  clearFeatureFlagCache();
  // 처음부터 못 읽으면 모두 켜진 것으로 본다
  assert.equal(await isFeatureDisabled("photoUpload"), false);

  failReads = false;
  clearFeatureFlagCache();
  assert.equal(await isFeatureDisabled("photoUpload"), true);
  // 캐시가 만료된 뒤 다시 읽다가 실패하면 마지막 상태(차단)를 그대로 쓴다
  failReads = true;
  clearFeatureFlagCache({ keepState: true });
  assert.equal(await isFeatureDisabled("photoUpload"), true);
});

test("환경변수 DISABLED_FEATURES로 지정한 기능은 DB와 무관하게 꺼지고, 관리자 화면에 표시된다", async () => {
  process.env.DISABLED_FEATURES = "kakaoApi, signup";
  assert.equal(await isFeatureDisabled("kakaoApi"), true);
  assert.equal(await isFeatureDisabled("signup"), true);
  assert.equal(await isFeatureDisabled("aiParse"), false);
  const states = await listFeatureStates();
  assert.equal(states.find((s) => s.key === "kakaoApi")?.forcedByEnv, true);
  assert.equal(states.find((s) => s.key === "aiParse")?.forcedByEnv, false);
});

test("차단 중에도 기존 여행 조회는 되고, 생성·AI·사진 업로드는 외부 호출/저장 전에 막힌다", async (t) => {
  t.mock.method(console, "warn", () => {});
  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  const user = await prisma.user.create({ data: { email: `flag-test-${id}@example.invalid`, nickname: `ft${id}` } });
  userIds.push(user.id);
  const { trip } = await createTrip(user, {
    name: "차단 전 여행",
    startDate: new Date("2026-11-01"),
    endDate: new Date("2026-11-02"),
    personnel: 1,
  });

  await setFeatureDisabled("tripCreate", true, "admin-1");
  await setFeatureDisabled("aiParse", true, "admin-1");
  await setFeatureDisabled("photoUpload", true, "admin-1");

  const trips = await listTrips(user.id);
  assert.deepEqual(
    trips.map((t) => t.id),
    [trip.id]
  );
  await assert.rejects(
    createTrip(user, { name: "x", startDate: new Date("2026-11-01"), endDate: new Date("2026-11-01"), personnel: 1 }),
    ServiceUnavailableError
  );
  await assert.rejects(extractPlaces(user.id, "서울 경복궁 다녀옴 ".repeat(3)), ServiceUnavailableError);
  let saved = false;
  await assert.rejects(
    withUploadQuota(user.id, 10, async () => {
      saved = true;
    }),
    ServiceUnavailableError
  );
  assert.equal(saved, false);
});
