import { CircuitBreaker } from "../externalGuard";
import { isFeatureDisabled } from "../featureFlags";
import { GLOBAL_SUBJECT, hit, KST_OFFSET_SEC, type RateRule } from "../rateLimit";

// 카카오 REST API 호출은 전부 여기를 거친다(장소검색: geocode.ts, 길찾기: routes.ts) — docs/SECURITY_PLAN.md 2단계.
//   1) 키 미설정 → 호출 안 함   2) 회로 차단 중 → 호출 안 함   3) 서비스 전체 일일 예산 초과 → 호출 안 함
//   4) 타임아웃 5초, 재시도 없음   5) 실패가 이어지면 회로 차단
// 카카오 운영정책상 응답 결과는 캐시/저장하지 않는다(README 2026-10-06 참고) — 그래서 예산을 다 쓰면 그날은 새 결과를 못 준다.

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const TIMEOUT_MS = 5_000;
const BLOCK_RATIO = 0.95;
const WARN_RATIO = 0.8;

export type KakaoApi = "local" | "directions";

// 카카오 개발자 콘솔(로컬)·카카오모빌리티 콘솔(길찾기)에서 확인한 일일 쿼터로 설정한다. 기본값은 보수적으로 잡은 임시값.
function envQuota(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
const DAILY_QUOTA: Record<KakaoApi, number> = {
  local: envQuota("KAKAO_LOCAL_DAILY_QUOTA", 100_000),
  directions: envQuota("KAKAO_DIRECTIONS_DAILY_QUOTA", 10_000),
};

const breakers: Record<KakaoApi, CircuitBreaker> = {
  local: new CircuitBreaker("kakao-local"),
  directions: new CircuitBreaker("kakao-directions"),
};

// disabled: 관리자가 긴급 차단(kakaoApi)을 켠 상태
export type KakaoResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: "no_key" | "disabled" | "blocked" | "failed" };

// 이번 호출을 일일 예산에 1건 기록하고 아직 쓸 수 있는지 돌려준다. 80%를 넘는 순간 한 번 경고 로그.
async function reserveDailyCall(api: KakaoApi): Promise<boolean> {
  const quota = DAILY_QUOTA[api];
  const rule: RateRule = {
    name: `kakao:${api}:1d`,
    limit: Math.floor(quota * BLOCK_RATIO),
    windowSec: 24 * 60 * 60,
    offsetSec: KST_OFFSET_SEC,
  };
  try {
    const { count } = await hit(rule, GLOBAL_SUBJECT);
    if (count === Math.floor(quota * WARN_RATIO)) {
      console.warn(`[kakao] ${api} 일일 쿼터 80% 사용 (${count}/${quota})`);
    }
    if (count === rule.limit + 1) {
      console.warn(`[kakao] ${api} 일일 쿼터 95% 도달 — 오늘 남은 신규 호출 차단`);
    }
    return count <= rule.limit;
  } catch (err) {
    // 예산 카운터 장애로 기능 전체를 막지는 않는다(fail-open)
    console.error(`[kakao] ${api} 예산 카운터 갱신 실패 — 호출 허용`, err);
    return true;
  }
}

export function isKakaoConfigured() {
  return Boolean(KAKAO_REST_API_KEY);
}

export async function kakaoGet(api: KakaoApi, url: URL): Promise<KakaoResult> {
  if (!KAKAO_REST_API_KEY) return { ok: false, reason: "no_key" };
  if (await isFeatureDisabled("kakaoApi")) return { ok: false, reason: "disabled" };
  const breaker = breakers[api];
  if (breaker.isOpen()) return { ok: false, reason: "blocked" };
  if (!(await reserveDailyCall(api))) return { ok: false, reason: "blocked" };

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // 네트워크/TLS 오류, 타임아웃
    breaker.recordFailure();
    return { ok: false, reason: "failed" };
  }

  // 400(잘못된 요청, 예: 경로를 찾을 수 없는 좌표)은 카카오 장애가 아니라 회로 차단에 세지 않는다
  if (!res.ok) {
    if (res.status !== 400) breaker.recordFailure();
    return { ok: false, reason: "failed" };
  }

  try {
    const data = await res.json();
    breaker.recordSuccess();
    return { ok: true, data };
  } catch {
    breaker.recordFailure();
    return { ok: false, reason: "failed" };
  }
}
