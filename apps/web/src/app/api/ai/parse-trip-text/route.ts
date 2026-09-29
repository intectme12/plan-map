import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { extractPlaces } from "@/lib/services/aiImport";
import { aiParseNewTripRequestSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

// 아직 여행이 없는 상태에서 "AI로 새 여행 만들기" 화면이 쓰는 엔드포인트 — 특정 여행에
// 종속되지 않아(tripId 없음) 로그인 여부만 확인한다. 여행지/기간/인원을 클라이언트가
// 직접 보내야 한다(트립 조회로 대신할 수 없어서, /api/trips/[tripId]/ai-parse와 다른 점).
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const { text, destination, dayCount, personnel, budgetWon, style, transport } =
      aiParseNewTripRequestSchema.parse(body);
    const places = await extractPlaces(text, { destination, dayCount, personnel, budgetWon, style, transport });
    return NextResponse.json({ places });
  } catch (err) {
    return handleRouteError(err);
  }
}
