import { prisma } from "../db";
import { NotFoundError, RateLimitedError, ServiceUnavailableError } from "../errors";
import { ConcurrencyLimiter } from "../externalGuard";
import { addUsage, assertRateLimits, GLOBAL_SUBJECT, RATE_RULES, remainingBudget } from "../rateLimit";
import { extractPlacesFromText, type ExtractedPlace, type ExtractPlacesContext } from "./aiParse";
import { getTripDays } from "@/app/trips/[tripId]/days";

export type { ExtractedPlace, ExtractPlacesContext };

// 지오코딩(장소명 → 좌표)은 이 서비스의 책임이 아니다 — 클라이언트가 추출된 장소마다
// GET /api/places/search를 개별 호출해서 처리한다(실제 "N/M 확인 중" 진행률을 만들기 위함,
// AiPlanFlow.tsx 참고). 여기선 순수 텍스트 추출만 한다.
//
// 비용 보호(docs/SECURITY_PLAN.md 2단계) — 호출 전: 사용자 시간당 횟수, 사용자/서비스 전체 일일 토큰 예산,
// 동시 실행 수(사용자 1개, 서버 전체 AI_MAX_CONCURRENCY개). 호출 후: 실제 사용 토큰을 예산에 더한다.
const aiConcurrency = new ConcurrencyLimiter(1, Number(process.env.AI_MAX_CONCURRENCY) || 4);

async function extract(
  userId: string,
  rawText: string,
  context?: ExtractPlacesContext
): Promise<ExtractedPlace[]> {
  await assertRateLimits(
    [{ rule: RATE_RULES.aiPerUserHour, subject: userId }],
    "AI 분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
  );

  const [userBudget, globalBudget] = await Promise.all([
    remainingBudget(RATE_RULES.aiTokensPerUserDay, userId),
    remainingBudget(RATE_RULES.aiTokensGlobalDay, GLOBAL_SUBJECT),
  ]);
  if (userBudget.remaining <= 0) {
    throw new RateLimitedError(
      "오늘 사용할 수 있는 AI 분석량을 모두 사용했습니다. 내일 다시 시도해주세요.",
      userBudget.retryAfterSec
    );
  }
  if (globalBudget.remaining <= 0) {
    console.warn("[ai] 서비스 전체 일일 토큰 예산 소진 — AI 분석 중지");
    throw new ServiceUnavailableError("오늘 AI 분석 사용량이 많아 일시적으로 중지되었습니다. 내일 다시 시도해주세요.");
  }

  const slot = aiConcurrency.tryAcquire(userId);
  if (!slot.ok) {
    if (slot.reason === "key") {
      throw new RateLimitedError("이전 AI 분석이 아직 진행 중입니다. 끝난 뒤 다시 시도해주세요.", 5);
    }
    throw new ServiceUnavailableError("AI 분석 요청이 몰려 있습니다. 잠시 후 다시 시도해주세요.");
  }

  let result;
  try {
    result = await extractPlacesFromText(rawText, context);
  } finally {
    slot.release();
  }
  if (result === null) {
    throw new ServiceUnavailableError(
      "AI 자동생성 기능을 사용하려면 GROQ_API_KEY 설정이 필요합니다."
    );
  }

  await Promise.all([
    addUsage(RATE_RULES.aiTokensPerUserDay, userId, result.totalTokens),
    addUsage(RATE_RULES.aiTokensGlobalDay, GLOBAL_SUBJECT, result.totalTokens),
  ]);
  return result.places;
}

// 이미 만든 여행에 AI로 장소를 추가하는 플로우 — 여행 편집 권한을 확인하면서, 그 김에
// 이름/기간/인원도 같이 읽어와 AI 프롬프트 컨텍스트로 넘긴다(별도 조회 없이 한 번에).
export async function parseTripText(
  userId: string,
  tripId: string,
  rawText: string,
  extraContext?: Pick<ExtractPlacesContext, "budgetWon" | "style" | "transport">
): Promise<ExtractedPlace[]> {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, OR: [{ userId }, { shares: { some: { userId } } }] },
    select: { name: true, startDate: true, endDate: true, personnel: true },
  });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");

  const context: ExtractPlacesContext = {
    ...extraContext,
    destination: trip.name,
    dayCount: getTripDays(trip.startDate, trip.endDate).length,
    personnel: trip.personnel,
  };
  return extract(userId, rawText, context);
}

// 아직 여행이 없는 상태에서 AI로 새 여행을 만드는 플로우 — 특정 여행에 종속되지 않아
// 소유권 검사가 필요 없다(로그인 여부는 라우트에서 이미 확인). userId는 사용량 제한용.
export async function extractPlaces(
  userId: string,
  rawText: string,
  context?: ExtractPlacesContext
): Promise<ExtractedPlace[]> {
  return extract(userId, rawText, context);
}
