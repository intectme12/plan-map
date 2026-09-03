import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchPlaceCandidates } from "@/lib/services/geocode";
import { unauthorized } from "@/lib/http";

// 특정 여행에 종속되지 않는 순수 카카오 장소검색 프록시 — 소유권 검사 불필요, 로그인만 확인.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ candidates: [] });
  }

  const candidates = await searchPlaceCandidates(q);
  if (candidates === null) {
    return NextResponse.json({ error: "KAKAO_REST_API_KEY 설정이 필요합니다." }, { status: 503 });
  }

  return NextResponse.json({ candidates });
}
