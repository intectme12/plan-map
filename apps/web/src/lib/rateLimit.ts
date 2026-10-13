import { createHash } from "node:crypto";
import { prisma } from "./db";
import { RateLimitedError } from "./errors";

// 요청 제한 — PostgreSQL 원자적 카운터(고정 창). docs/SECURITY_PLAN.md 참고.
// INSERT … ON CONFLICT DO UPDATE … RETURNING 한 문장으로 증가와 확인을 같이 해서, 동시 요청·서버 재시작·
// 서버 여러 대에서도 한도를 넘겨 통과하지 못한다. 요청마다 DB 쓰기가 생기므로 쓰기/고비용 경로에만 쓴다.
// Redis를 도입하면 hit()만 바꾸면 된다.

// offsetSec: 창 경계를 UTC 자정이 아니라 다른 시각에 맞출 때(일일 예산은 한국 자정 기준 — KST_OFFSET_SEC)
export type RateRule = { name: string; limit: number; windowSec: number; offsetSec?: number };

// subject가 null이면(예: 프록시 미설정이라 IP를 모름) 그 규칙은 건너뛴다.
export type RateCheck = { rule: RateRule; subject: string | null };

export type RateLimitResult = { ok: true } | { ok: false; rule: string; retryAfterSec: number };

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
export const KST_OFFSET_SEC = 9 * HOUR;

function envInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export const RATE_RULES = {
  registerPerIp10m: { name: "register:ip:10m", limit: 5, windowSec: 10 * MINUTE },
  registerPerIpDay: { name: "register:ip:1d", limit: 20, windowSec: DAY },
  registerGlobalHour: { name: "register:all:1h", limit: 200, windowSec: HOUR },
  loginPerIp10m: { name: "login:ip:10m", limit: 20, windowSec: 10 * MINUTE },
  loginPerEmail10m: { name: "login:email:10m", limit: 10, windowSec: 10 * MINUTE },

  // AI 파싱 — 호출 횟수(요청 시점에 셈)와 토큰 사용량(응답 후 실제 사용량을 더함)을 따로 센다
  aiPerUserHour: { name: "ai:user:1h", limit: 10, windowSec: HOUR },
  aiTokensPerUserDay: {
    name: "ai-tokens:user:1d",
    limit: envInt("AI_USER_DAILY_TOKEN_LIMIT", 100_000),
    windowSec: DAY,
    offsetSec: KST_OFFSET_SEC,
  },
  aiTokensGlobalDay: {
    name: "ai-tokens:all:1d",
    limit: envInt("AI_DAILY_TOKEN_BUDGET", 1_000_000),
    windowSec: DAY,
    offsetSec: KST_OFFSET_SEC,
  },

  // 여행 생성·복사 — 신규 계정(가입 24시간 미만)은 일일 한도가 따로 더 낮다. 서비스 전체 한도는 생성+복사 합산.
  tripCreatePerUserMin: { name: "trip-create:user:1m", limit: 5, windowSec: MINUTE },
  tripCreatePerUserDay: { name: "trip-create:user:1d", limit: 30, windowSec: DAY, offsetSec: KST_OFFSET_SEC },
  tripCreateNewUserDay: { name: "trip-create:new-user:1d", limit: 3, windowSec: DAY, offsetSec: KST_OFFSET_SEC },
  tripCopyPerUserHour: { name: "trip-copy:user:1h", limit: 10, windowSec: HOUR },
  tripCopyNewUserDay: { name: "trip-copy:new-user:1d", limit: 2, windowSec: DAY, offsetSec: KST_OFFSET_SEC },
  tripWriteGlobalMin: { name: "trip-create:all:1m", limit: 300, windowSec: MINUTE },
  // 장소 추가 — AI 일정 저장은 장소(최대 30개)를 연달아 추가하므로 그보다 넉넉히
  placeAddPerUserMin: { name: "place-add:user:1m", limit: 60, windowSec: MINUTE },

  // 업로드(장소 사진·대표사진·프로필 사진·메시지 사진 합산) — 횟수 + 하루 용량(바이트)
  uploadPerUser10m: { name: "upload:user:10m", limit: 60, windowSec: 10 * MINUTE },
  uploadBytesPerUserDay: {
    name: "upload-bytes:user:1d",
    limit: envInt("UPLOAD_USER_DAILY_BYTES", 300 * 1024 * 1024),
    windowSec: DAY,
    offsetSec: KST_OFFSET_SEC,
  },
  // 그 밖의 쓰기 — 사람이 직접 누르는 속도보다 넉넉히, 스크립트 반복만 막는 수준
  expenseAddPerUserMin: { name: "expense-add:user:1m", limit: 60, windowSec: MINUTE },
  reviewPerUserMin: { name: "review:user:1m", limit: 20, windowSec: MINUTE },
  followPerUserMin: { name: "follow:user:1m", limit: 30, windowSec: MINUTE },
  likePerUserMin: { name: "like:user:1m", limit: 60, windowSec: MINUTE },
  sharePerUserMin: { name: "share:user:1m", limit: 30, windowSec: MINUTE },
  messagePerUserMin: { name: "message:user:1m", limit: 60, windowSec: MINUTE },
  conversationCreatePerUserMin: { name: "conversation-create:user:1m", limit: 20, windowSec: MINUTE },

  // 카카오 — 사용자별 요청 횟수(우리 API 기준). 경로는 여행 상세를 열 때 구간 수만큼 한꺼번에 요청하므로 넉넉히.
  placeSearchPerUserMin: { name: "place-search:user:1m", limit: 60, windowSec: MINUTE },
  routePerUserMin: { name: "route:user:1m", limit: 120, windowSec: MINUTE },
} satisfies Record<string, RateRule>;

export const GLOBAL_SUBJECT = "all";

// 이메일 같은 개인정보를 키(=DB 행)에 원문으로 남기지 않도록 해시해서 쓴다
export function hashSubject(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 32);
}

const CLEANUP_PROBABILITY = 0.01;

function windowOf(rule: RateRule, now: number) {
  const windowMs = rule.windowSec * 1000;
  const offsetMs = (rule.offsetSec ?? 0) * 1000;
  const windowStart = Math.floor((now + offsetMs) / windowMs) * windowMs - offsetMs;
  return { windowStart, expiresAt: windowStart + windowMs };
}

// 규칙 하나의 이번 창 카운트를 amount만큼 올리고(0이면 조회만) 올린 뒤 값과 창이 끝나는 시각을 돌려준다
export async function hit(rule: RateRule, subject: string, now = Date.now(), amount = 1) {
  const { windowStart, expiresAt } = windowOf(rule, now);
  const key = `${rule.name}:${subject}`;

  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limit_counters" ("key", "windowStart", "count", "expiresAt")
    VALUES (${key}, ${new Date(windowStart)}, ${amount}, ${new Date(expiresAt)})
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "rate_limit_counters"."count" + ${amount}
    RETURNING "count"`;

  // 만료된 창은 가끔 한 번씩 정리(응답을 기다리게 하지 않음)
  if (Math.random() < CLEANUP_PROBABILITY) {
    prisma.rateLimitCounter
      .deleteMany({ where: { expiresAt: { lt: new Date(now) } } })
      .catch((err) => console.error("[rate-limit] 만료 카운터 정리 실패", err));
  }

  return { count: Number(rows[0]?.count ?? 0), expiresAt };
}

function retryAfter(expiresAt: number, now: number) {
  return Math.max(1, Math.ceil((expiresAt - now) / 1000));
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
    const retryAfterSec = retryAfter(expiresAt, now);
    if (!denied || retryAfterSec > denied.retryAfterSec) denied = { rule: rule.name, retryAfterSec };
  }

  if (!denied) return { ok: true };
  // 규칙 이름만 남긴다 — IP·이메일 등 주체 값은 로그에 남기지 않음
  console.warn(`[rate-limit] 한도 초과: ${denied.rule}`);
  return { ok: false, ...denied };
}

// 서비스 함수에서 쓰는 버전 — 초과하면 RateLimitedError(→ handleRouteError가 429 + Retry-After)
export async function assertRateLimits(checks: RateCheck[], message?: string): Promise<void> {
  const result = await enforceRateLimits(checks);
  if (!result.ok) throw new RateLimitedError(message, result.retryAfterSec);
}

// 사용량 예산(토큰 등) — 호출 전엔 이미 다 썼는지만 보고(usage), 호출 후 실제 사용량을 더한다(addUsage).
// 요청 하나가 예산을 조금 넘길 수는 있지만, 다 쓴 뒤에는 다음 창까지 새 호출을 막는다.
export async function remainingBudget(rule: RateRule, subject: string, now = Date.now()) {
  try {
    const { count, expiresAt } = await hit(rule, subject, now, 0);
    return { remaining: rule.limit - count, retryAfterSec: retryAfter(expiresAt, now) };
  } catch (err) {
    console.error(`[rate-limit] 예산 조회 실패 — 제한 없이 통과: ${rule.name}`, err);
    return { remaining: rule.limit, retryAfterSec: 0 };
  }
}

export async function addUsage(rule: RateRule, subject: string, amount: number, now = Date.now()) {
  if (amount <= 0) return;
  try {
    await hit(rule, subject, now, Math.ceil(amount));
  } catch (err) {
    console.error(`[rate-limit] 사용량 기록 실패: ${rule.name}`, err);
  }
}
