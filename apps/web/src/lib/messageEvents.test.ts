import { test } from "node:test";
import assert from "node:assert/strict";
import { canSubscribe, subscribe, unsubscribe, SSE_MAX_PER_USER } from "./messageEvents";

const fakeController = () => ({}) as ReadableStreamDefaultController;

test("사용자당 실시간 연결 수 상한을 넘으면 거절하고, 끊긴 만큼 다시 허용한다", () => {
  const userId = "sse-test-user";
  const controllers = Array.from({ length: SSE_MAX_PER_USER }, fakeController);
  for (const c of controllers) {
    assert.deepEqual(canSubscribe(userId), { ok: true });
    subscribe(userId, c);
  }
  assert.deepEqual(canSubscribe(userId), { ok: false, reason: "user" });
  assert.deepEqual(canSubscribe("someone-else"), { ok: true }, "다른 사용자는 영향 없음");

  // 같은 연결을 두 번 등록/해제해도 한 번만 센다
  subscribe(userId, controllers[0]);
  unsubscribe(userId, controllers[0]);
  unsubscribe(userId, controllers[0]);
  assert.deepEqual(canSubscribe(userId), { ok: true });

  for (const c of controllers) unsubscribe(userId, c);
});
