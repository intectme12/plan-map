import { prisma } from "./db";
import { ServiceUnavailableError } from "./errors";

// 기능별 긴급 차단 스위치 — docs/SECURITY_PLAN.md 5단계.
// 공격·비용 폭주·외부 장애 때 관리자가 /admin/features에서 기능 하나만 바로 끈다(재시작 불필요).
// 쓰기·외부 호출 경로에서만 검사하므로, 꺼도 이미 있는 여행·장소·이동정보 조회 같은 읽기 기능은 그대로 동작한다.
//
// 상태는 DB(feature_flags)에 두고 서버 메모리에 30초 캐시한다 — 다른 서버에는 최대 30초 뒤 반영, 같은 서버는 즉시.
// DB를 못 읽으면 마지막으로 읽은 상태를 유지한다(처음부터 못 읽었으면 모두 켜진 것으로 봄).
// DB와 별개로 환경변수 DISABLED_FEATURES(쉼표 구분 key)에 넣은 기능은 항상 꺼진다 — DB 자체가 문제일 때의 비상구.

export const FEATURES = {
  signup: {
    label: "회원가입",
    description: "이메일·소셜 신규 가입. 기존 회원 로그인은 계속 가능",
    message: "지금은 신규 회원가입을 잠시 중단했습니다. 잠시 후 다시 시도해주세요.",
  },
  aiParse: {
    label: "AI 일정 분석",
    description: "텍스트로 여행 일정 만들기·장소 추가(Groq 호출)",
    message: "AI 분석 기능을 잠시 중단했습니다. 잠시 후 다시 시도해주세요.",
  },
  kakaoApi: {
    label: "카카오 장소검색·길찾기",
    description: "카카오 신규 호출. 이미 저장된 여행·장소·이동정보 표시는 유지",
    message: "장소 검색을 잠시 중단했습니다. 잠시 후 다시 시도해주세요.",
  },
  tripCreate: {
    label: "여행 만들기·복사",
    description: "새 여행 만들기, 공개 여행 복사. 기존 여행 보기·수정은 유지",
    message: "새 여행 만들기를 잠시 중단했습니다. 잠시 후 다시 시도해주세요.",
  },
  photoUpload: {
    label: "사진 업로드",
    description: "장소 사진·대표사진·프로필 사진·메시지 사진. 글 메시지는 유지",
    message: "사진 업로드를 잠시 중단했습니다. 잠시 후 다시 시도해주세요.",
  },
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureKey(value: string): value is FeatureKey {
  return Object.hasOwn(FEATURES, value);
}

const CACHE_MS = 30_000;
let cache: { at: number; disabled: Set<string> } | null = null;

function envDisabled(): Set<string> {
  return new Set(
    (process.env.DISABLED_FEATURES ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

async function dbDisabled(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.disabled;
  try {
    const rows = await prisma.featureFlag.findMany({ where: { disabled: true }, select: { key: true } });
    cache = { at: Date.now(), disabled: new Set(rows.map((r) => r.key)) };
  } catch (err) {
    console.error("[feature-flags] 상태 조회 실패 — 마지막 상태 유지", err);
    // 실패해도 매 요청마다 DB를 다시 두드리지 않도록 시각만 갱신
    cache = { at: Date.now(), disabled: cache?.disabled ?? new Set() };
  }
  return cache.disabled;
}

export async function isFeatureDisabled(key: FeatureKey): Promise<boolean> {
  return envDisabled().has(key) || (await dbDisabled()).has(key);
}

// 꺼져 있으면 503 + 안내 문구
export async function assertFeatureEnabled(key: FeatureKey): Promise<void> {
  if (await isFeatureDisabled(key)) throw new ServiceUnavailableError(FEATURES[key].message);
}

export async function listFeatureStates() {
  const rows = await prisma.featureFlag.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const forced = envDisabled();
  return (Object.keys(FEATURES) as FeatureKey[]).map((key) => {
    const row = byKey.get(key);
    return {
      key,
      label: FEATURES[key].label,
      description: FEATURES[key].description,
      disabled: row?.disabled ?? false,
      forcedByEnv: forced.has(key),
      reason: row?.reason ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export async function setFeatureDisabled(key: FeatureKey, disabled: boolean, adminId: string, reason?: string) {
  await prisma.featureFlag.upsert({
    where: { key },
    create: { key, disabled, reason: reason || null, updatedBy: adminId },
    update: { disabled, reason: reason || null, updatedBy: adminId },
  });
  cache = null; // 이 서버에는 즉시 반영
  console.warn(`[feature-flags] ${key} ${disabled ? "차단" : "재개"}`);
}

// 테스트용 — keepState면 마지막 상태는 둔 채 만료만 시키고(다음 조회에서 DB를 다시 읽음), 아니면 완전히 비운다
export function clearFeatureFlagCache({ keepState = false } = {}) {
  if (keepState && cache) cache = { at: 0, disabled: cache.disabled };
  else cache = null;
}
