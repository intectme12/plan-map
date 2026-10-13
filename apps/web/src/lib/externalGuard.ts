// 외부 API(카카오·Groq) 보호용 — 회로 차단기, 동시 실행 수 제한. docs/SECURITY_PLAN.md 2단계.
// 둘 다 프로세스 메모리에 상태를 둔다(서버 1대 기준). 서버를 여러 대로 늘리면 서버마다 따로 세지므로
// 그때는 Redis로 옮긴다. 일일 예산처럼 서버가 여러 대여도 정확해야 하는 값은 lib/rateLimit.ts(DB)를 쓴다.

// 연속 실패가 threshold번 나면 cooldownMs 동안 호출 자체를 막는다(장애 중인 외부 API를 계속 두드리지 않도록).
// 쿨다운이 끝난 직후의 첫 호출이 또 실패하면 바로 다시 막는다(half-open).
export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  private halfOpen = false;

  constructor(
    readonly name: string,
    private readonly threshold = 5,
    private readonly cooldownMs = 60_000,
    private readonly now: () => number = Date.now
  ) {}

  isOpen(): boolean {
    return this.now() < this.openUntil;
  }

  recordSuccess() {
    this.failures = 0;
    this.halfOpen = false;
  }

  recordFailure() {
    this.failures += 1;
    if (this.halfOpen || this.failures >= this.threshold) {
      this.openUntil = this.now() + this.cooldownMs;
      this.failures = 0;
      this.halfOpen = true;
      console.warn(`[circuit] ${this.name} 차단 ${Math.round(this.cooldownMs / 1000)}초`);
    }
  }
}

export type AcquireResult = { ok: true; release: () => void } | { ok: false; reason: "key" | "total" };

// 키(사용자)별 동시 실행 수와 전체 동시 실행 수를 함께 제한한다. release는 여러 번 불려도 한 번만 반영.
export class ConcurrencyLimiter {
  private readonly active = new Map<string, number>();
  private total = 0;

  constructor(
    private readonly perKey: number,
    private readonly maxTotal: number
  ) {}

  tryAcquire(key: string): AcquireResult {
    const current = this.active.get(key) ?? 0;
    if (current >= this.perKey) return { ok: false, reason: "key" };
    if (this.total >= this.maxTotal) return { ok: false, reason: "total" };

    this.active.set(key, current + 1);
    this.total += 1;
    let released = false;
    return {
      ok: true,
      release: () => {
        if (released) return;
        released = true;
        const left = (this.active.get(key) ?? 1) - 1;
        if (left <= 0) this.active.delete(key);
        else this.active.set(key, left);
        this.total -= 1;
      },
    };
  }
}
