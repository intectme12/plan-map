import { createHash } from "node:crypto";
import { prisma } from "./db";

// 요청 제한 — PostgreSQL 원자적 카운터(고정 창). docs/SECURITY_PLAN.md 참고.
// INSERT … ON CONFLICT DO UPDATE … RETURNING 한 문장으로 증가와 확인을 같이 해서, 동시 요청·서버 재시작·
// 서버 여러 대에서도 한도를 넘겨 통과하지 못한다. 요청마다 DB 쓰기가 생기므로 쓰기/고비용 경로에만 쓴다.
// Redis를 도입하면 hit()만 바꾸면 된다.

export type RateRule = { name: string; limit: number; windowSec: number };

// subject가 null이면(예: 프록시 미설정이라 IP를 모름) 그 규칙은 건너뛴다.
export type RateCheck = { rule: RateRule; subject: string | null };

export type RateLimitResult = { ok: true } | { ok: false; rule: string; retryAfterSec: number };

export const RATE_RULES = {
  registerPerIp10m: { name: "register:ip:10m", limit: 5, windowSec: 10 * 60 },
  registerPerIpDay: { name: "register:ip:1d", limit: 20, windowSec: 24 * 60 * 60 },
  registerGlobalHour: { name: "register:all:1h", limit: 200, windowSec: 60 * 60 },
  loginPerIp10m: { name: "login:ip:10m", limit: 20, windowSec: 10 * 60 },
  loginPerEmail10m: { name: "login:email:10m", limit: 10, windowSec: 10 * 60 },
} satisfies Record<string, RateRule>;

export const GLOBAL_SUBJECT = "all";

// 이메일 같은 개인정보를 키(=DB 행)에 원문으로 남기지 않도록 해시해서 쓴다
export function hashSubject(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 32);
}

const CLEANUP_PROBABILITY = 0.01;

// 규칙 하나의 이번 창 카운트를 1 올리고 올린 뒤 값과 창이 끝나는 시각을 돌려준다
export async function hit(rule: RateRule, subject: string, now = Date.now()) {
  const windowMs = rule.windowSec * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = windowStart + windowMs;
  const key = `${rule.name}:${subject}`;

  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limit_counters" ("key", "windowStart", "count", "expiresAt")
    VALUES (${key}, ${new Date(windowStart)}, 1, ${new Date(expiresAt)})
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "rate_limit_counters"."count" + 1
    RETURNING "count"`;

  // 만료된 창은 가끔 한 번씩 정리(응답을 기다리게 하지 않음)
  if (Math.random() < CLEANUP_PROBABILITY) {
    prisma.rateLimitCounter
      .deleteMany({ where: { expiresAt: { lt: new Date(now) } } })
      .catch((err) => console.error("[rate-limit] 만료 카운터 정리 실패", err));
  }

  return { count: Number(rows[0]?.count ?? 0), expiresAt };
}

// 여러 규칙을 한꺼번에 적용한다. 하나라도 넘으면 거절하고, 가장 늦게 풀리는 시각을 Retry-After로 쓴다.
// DB 오류 시엔 막지 않고 통과시킨다(fail-open) — 제한 저장소 장애로 로그인·가입 전체가 멈추지 않도록.
export async function enforceRateLimits(checks: RateCheck[], now = Date.now()): Promise<RateLimitResult> {
  const active = checks.filter((c): c is { rule: RateRule; subject: string } => c.subject !== null);
  let results;
  try {
    results = await Promise.all(active.map((c) => hit(c.rule, c.subject, now)));
  } catch (err) {
    console.error("[rate-limit] 카운터 갱신 실패 — 제한 없이 통과", err);
    return { ok: true };
  }

  let denied: { rule: string; retryAfterSec: number } | null = null;
  for (let i = 0; i < results.length; i++) {
    const { count, expiresAt } = results[i];
    const { rule } = active[i];
    if (count <= rule.limit) continue;
    const retryAfterSec = Math.max(1, Math.ceil((expiresAt - now) / 1000));
    if (!denied || retryAfterSec > denied.retryAfterSec) denied = { rule: rule.name, retryAfterSec };
  }

  if (!denied) return { ok: true };
  // 규칙 이름만 남긴다 — IP·이메일 등 주체 값은 로그에 남기지 않음
  console.warn(`[rate-limit] 한도 초과: ${denied.rule}`);
  return { ok: false, ...denied };
}
