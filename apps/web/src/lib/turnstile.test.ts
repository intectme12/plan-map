import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstile } from "./turnstile";

// Cloudflare 공식 테스트 키 — 항상 통과 / 항상 실패 / 이미 쓴 토큰. 테스트 키는 더미 토큰만 받는다.
const PASS_SECRET = "1x0000000000000000000000000000000AA";
const FAIL_SECRET = "2x0000000000000000000000000000000AA";
const SPENT_SECRET = "3x0000000000000000000000000000000AA";
const DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

test("시크릿 키가 없으면 검증을 건너뛴다(로컬 개발)", async () => {
  assert.deepEqual(await verifyTurnstile(undefined, null, ""), { ok: true, skipped: "no_secret" });
});

test("토큰이 없거나 너무 길면 Cloudflare에 묻지 않고 거절한다", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch");
  assert.deepEqual(await verifyTurnstile(undefined, null, PASS_SECRET), { ok: false, reason: "missing_token" });
  assert.deepEqual(await verifyTurnstile("", null, PASS_SECRET), { ok: false, reason: "missing_token" });
  assert.deepEqual(await verifyTurnstile("x".repeat(2049), null, PASS_SECRET), {
    ok: false,
    reason: "missing_token",
  });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("Cloudflare에 닿지 못하면(타임아웃·5xx) 가입을 막지 않는다", async (t) => {
  t.mock.method(console, "warn", () => {});
  t.mock.method(globalThis, "fetch", async () => {
    throw new DOMException("timeout", "TimeoutError");
  });
  assert.deepEqual(await verifyTurnstile(DUMMY_TOKEN, null, PASS_SECRET), { ok: true, skipped: "unreachable" });
  t.mock.restoreAll();
  t.mock.method(console, "warn", () => {});
  t.mock.method(globalThis, "fetch", async () => new Response("down", { status: 503 }));
  assert.deepEqual(await verifyTurnstile(DUMMY_TOKEN, null, PASS_SECRET), { ok: true, skipped: "unreachable" });
});

test("요청에 시크릿·토큰·IP를 담되, IPv6 /64 표기는 보내지 않는다", async (t) => {
  const bodies: URLSearchParams[] = [];
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    bodies.push(init.body as URLSearchParams);
    return Response.json({ success: true });
  });
  await verifyTurnstile(DUMMY_TOKEN, "203.0.113.7", PASS_SECRET);
  await verifyTurnstile(DUMMY_TOKEN, "2001:0db8:abcd:0012::/64", PASS_SECRET);
  assert.equal(bodies[0].get("secret"), PASS_SECRET);
  assert.equal(bodies[0].get("response"), DUMMY_TOKEN);
  assert.equal(bodies[0].get("remoteip"), "203.0.113.7");
  assert.equal(bodies[1].get("remoteip"), null);
});

// 실제 Cloudflare siteverify를 공식 테스트 키로 호출(부하 없음, 비용 없음) — 네트워크가 안 되면 건너뜀
test("실제 Cloudflare: 통과 키는 통과, 실패 키·이미 쓴 토큰은 거절", async (t) => {
  t.mock.method(console, "warn", () => {});
  const pass = await verifyTurnstile(DUMMY_TOKEN, null, PASS_SECRET);
  if (pass.ok && pass.skipped === "unreachable") {
    t.skip("Cloudflare에 연결할 수 없음");
    return;
  }
  assert.deepEqual(pass, { ok: true });
  assert.deepEqual(await verifyTurnstile(DUMMY_TOKEN, null, FAIL_SECRET), { ok: false, reason: "invalid" });
  assert.deepEqual(await verifyTurnstile(DUMMY_TOKEN, null, SPENT_SECRET), { ok: false, reason: "invalid" });
});
