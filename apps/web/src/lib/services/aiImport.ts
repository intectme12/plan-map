import { prisma } from "../db";
import { NotFoundError, ServiceUnavailableError } from "../errors";
import { extractPlacesFromText, type ExtractedPlace, type ExtractPlacesContext } from "./aiParse";
import { getTripDays } from "@/app/trips/[tripId]/days";

export type { ExtractedPlace, ExtractPlacesContext };

// 지오코딩(장소명 → 좌표)은 이 서비스의 책임이 아니다 — 클라이언트가 추출된 장소마다
// GET /api/places/search를 개별 호출해서 처리한다(실제 "N/M 확인 중" 진행률을 만들기 위함,
// AiPlanFlow.tsx 참고). 여기선 순수 텍스트 추출만 한다.
async function extract(rawText: string, context?: ExtractPlacesContext): Promise<ExtractedPlace[]> {
  const extracted = await extractPlacesFromText(rawText, context);
  if (extracted === null) {
    throw new ServiceUnavailableError(
      "AI 자동생성 기능을 사용하려면 GROQ_API_KEY 설정이 필요합니다."
    );
  }
  return extracted;
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
  return extract(rawText, context);
}

// 아직 여행이 없는 상태에서 AI로 새 여행을 만드는 플로우 — 특정 여행에 종속되지 않아
// 소유권 검사가 필요 없다(로그인 여부는 라우트에서 이미 확인)
export async function extractPlaces(
  rawText: string,
  context?: ExtractPlacesContext
): Promise<ExtractedPlace[]> {
  return extract(rawText, context);
}
