import { test } from "node:test";
import assert from "node:assert/strict";
import { CircuitBreaker, ConcurrencyLimiter } from "./externalGuard";

test("연속 실패가 기준에 닿으면 쿨다운 동안 막고, 끝나면 다시 허용한다", (t) => {
  t.mock.method(console, "warn", () => {});
  let now = 1_000;
  const breaker = new CircuitBreaker("test", 3, 60_000, () => now);
  breaker.recordFailure();
  breaker.recordFailure();
  assert.equal(breaker.isOpen(), false);
  breaker.recordFailure();
  assert.equal(breaker.isOpen(), true);
  now += 60_001;
  assert.equal(breaker.isOpen(), false);
});

test("쿨다운 직후 첫 호출이 또 실패하면 바로 다시 막고, 성공하면 정상으로 돌아간다", (t) => {
  t.mock.method(console, "warn", () => {});
  let now = 0;
  const breaker = new CircuitBreaker("test", 2, 1_000, () => now);
  breaker.recordFailure();
  breaker.recordFailure();
  now += 1_001;
  breaker.recordFailure();
  assert.equal(breaker.isOpen(), true, "half-open 상태 실패 1번으로 재차단");
  now += 1_001;
  breaker.recordSuccess();
  breaker.recordFailure();
  assert.equal(breaker.isOpen(), false, "성공 후엔 다시 기준 횟수만큼 실패해야 차단");
});

test("성공하면 실패 횟수가 초기화된다", () => {
  const breaker = new CircuitBreaker("test", 2);
  breaker.recordFailure();
  breaker.recordSuccess();
  breaker.recordFailure();
  assert.equal(breaker.isOpen(), false);
});

test("사용자별·전체 동시 실행 수를 제한하고, release 후엔 다시 허용한다", () => {
  const limiter = new ConcurrencyLimiter(1, 2);
  const a = limiter.tryAcquire("a");
  assert.equal(a.ok, true);
  assert.deepEqual(limiter.tryAcquire("a"), { ok: false, reason: "key" });
  const b = limiter.tryAcquire("b");
  assert.equal(b.ok, true);
  assert.deepEqual(limiter.tryAcquire("c"), { ok: false, reason: "total" });

  if (a.ok) {
    a.release();
    a.release(); // 두 번 불려도 한 번만 반영
  }
  assert.equal(limiter.tryAcquire("a").ok, true);
  assert.deepEqual(limiter.tryAcquire("c"), { ok: false, reason: "total" });
});
