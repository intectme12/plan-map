// Cloudflare Turnstile(봇 확인) 서버 검증 — 이메일 회원가입에 사용. docs/SECURITY_PLAN.md 6단계.
// 화면 위젯이 준 토큰을 Cloudflare siteverify로 확인한다. 토큰은 5분 유효, 한 번만 검증 가능.
//
// TURNSTILE_SECRET_KEY가 없으면 검증을 건너뛴다(로컬 개발 편의) — 운영에서는 반드시 설정할 것.
// 개발·테스트용 공식 키: 사이트 키 1x00000000000000000000AA / 시크릿 1x0000000000000000000000000000000AA(항상 통과).
//
// Cloudflare에 닿지 못하는 경우(네트워크 오류·타임아웃·5xx)는 가입을 막지 않는다(fail-open) — Cloudflare 장애로
// 신규 가입 전체가 멈추지 않게. 이때도 가입 요청 제한(IP·서비스 전체)은 그대로 걸려 있다.
// 토큰이 없거나 Cloudflare가 "실패"라고 답한 경우는 막는다.

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5_000;
const MAX_TOKEN_LENGTH = 2048;

export type TurnstileResult =
  | { ok: true; skipped?: "no_secret" | "unreachable" }
  | { ok: false; reason: "missing_token" | "invalid" };

export function isTurnstileEnabled(secret = process.env.TURNSTILE_SECRET_KEY) {
  return Boolean(secret);
}

export async function verifyTurnstile(
  token: unknown,
  remoteIp: string | null,
  secret = process.env.TURNSTILE_SECRET_KEY
): Promise<TurnstileResult> {
  if (!secret) return { ok: true, skipped: "no_secret" };
  if (typeof token !== "string" || !token || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams({ secret, response: token });
  // IPv6는 lib/clientIp.ts가 /64 대역 표기로 바꿔 두므로 실제 주소 형식일 때만 보낸다
  if (remoteIp && !remoteIp.includes("/")) body.set("remoteip", remoteIp);

  let res: Response;
  try {
    res = await fetch(SITEVERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    console.warn("[turnstile] Cloudflare 검증 서버에 연결하지 못해 확인 없이 통과");
    return { ok: true, skipped: "unreachable" };
  }
  if (res.status >= 500) {
    console.warn(`[turnstile] Cloudflare 검증 서버 오류(${res.status}) — 확인 없이 통과`);
    return { ok: true, skipped: "unreachable" };
  }

  const data = (await res.json().catch(() => null)) as { success?: boolean; "error-codes"?: string[] } | null;
  if (data?.success === true) return { ok: true };
  // 오류 코드만 남긴다(토큰·시크릿은 로그에 남기지 않음)
  console.warn(`[turnstile] 검증 실패: ${(data?.["error-codes"] ?? []).join(",") || "unknown"}`);
  return { ok: false, reason: "invalid" };
}
