import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

// 실제 카카오를 부르지 않는다 — fetch와 예산 카운터(DB)를 가짜로 바꿔서 판단 로직만 확인한다.
// kakaoClient는 import 시점에 환경변수를 읽으므로 먼저 설정하고 동적으로 불러온다.
process.env.KAKAO_REST_API_KEY = "test-key";
process.env.KAKAO_LOCAL_DAILY_QUOTA = "100"; // 차단 기준 95건
process.env.KAKAO_DIRECTIONS_DAILY_QUOTA = "100";

type Kakao = typeof import("./kakaoClient");
type Db = typeof import("../db");
let kakao: Kakao;
let db: Db;
let budgetCount = 0;
let fetchCalls: { url: string; init: RequestInit }[] = [];
let fetchImpl: () => Promise<Response> = async () => Response.json({ documents: [] });
const originalFetch = globalThis.fetch;
let originalQueryRaw: PropertyDescriptor | undefined;

before(async () => {
  db = await import("../db");
  kakao = await import("./kakaoClient");
  originalQueryRaw = Object.getOwnPropertyDescriptor(db.prisma, "$queryRaw");
  Object.defineProperty(db.prisma, "$queryRaw", {
    configurable: true,
    value: async () => [{ count: budgetCount }],
  });
  globalThis.fetch = (async (url: URL | string, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), init: init ?? {} });
    return fetchImpl();
  }) as typeof fetch;
});

after(async () => {
  globalThis.fetch = originalFetch;
  if (originalQueryRaw) Object.defineProperty(db.prisma, "$queryRaw", originalQueryRaw);
  else delete (db.prisma as unknown as Record<string, unknown>).$queryRaw;
  await db.prisma.$disconnect();
});

beforeEach(() => {
  budgetCount = 1;
  fetchCalls = [];
  fetchImpl = async () => Response.json({ documents: [] });
});

const url = () => new URL("https://dapi.kakao.com/v2/local/search/keyword.json?query=x");

test("정상 호출: 키를 헤더로 보내고 타임아웃 신호를 붙인다", async () => {
  const result = await kakao.kakaoGet("local", url());
  assert.deepEqual(result, { ok: true, data: { documents: [] } });
  assert.equal(fetchCalls.length, 1);
  assert.equal((fetchCalls[0].init.headers as Record<string, string>).Authorization, "KakaoAK test-key");
  assert.ok(fetchCalls[0].init.signal instanceof AbortSignal);
});

test("서비스 전체 일일 예산(쿼터 95%)을 넘으면 카카오를 부르지 않는다", async (t) => {
  t.mock.method(console, "warn", () => {});
  budgetCount = 95;
  assert.equal((await kakao.kakaoGet("local", url())).ok, true);
  budgetCount = 96;
  assert.deepEqual(await kakao.kakaoGet("local", url()), { ok: false, reason: "blocked" });
  assert.equal(fetchCalls.length, 1);
});

test("예산 카운터 장애 시엔 호출을 막지 않는다(fail-open)", async (t) => {
  t.mock.method(console, "error", () => {});
  Object.defineProperty(db.prisma, "$queryRaw", {
    configurable: true,
    value: async () => {
      throw new Error("db down");
    },
  });
  try {
    assert.equal((await kakao.kakaoGet("local", url())).ok, true);
  } finally {
    Object.defineProperty(db.prisma, "$queryRaw", {
      configurable: true,
      value: async () => [{ count: budgetCount }],
    });
  }
});

test("400은 회로 차단에 세지 않고, 연속 5번 장애(타임아웃·5xx)면 60초간 호출을 막는다", async (t) => {
  t.mock.method(console, "warn", () => {});
  fetchImpl = async () => new Response("bad", { status: 400 });
  for (let i = 0; i < 6; i++) {
    assert.deepEqual(await kakao.kakaoGet("directions", url()), { ok: false, reason: "failed" });
  }

  fetchImpl = async () => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  };
  for (let i = 0; i < 4; i++) await kakao.kakaoGet("directions", url());
  fetchImpl = async () => new Response("err", { status: 502 });
  await kakao.kakaoGet("directions", url());

  const callsBefore = fetchCalls.length;
  assert.deepEqual(await kakao.kakaoGet("directions", url()), { ok: false, reason: "blocked" });
  assert.equal(fetchCalls.length, callsBefore, "차단 중엔 fetch 자체를 안 함");
  // 다른 API(장소검색)의 회로는 별개
  fetchImpl = async () => Response.json({ documents: [] });
  assert.equal((await kakao.kakaoGet("local", url())).ok, true);
});
