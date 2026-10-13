import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchPlaceCandidates } from "@/lib/services/geocode";
import { unauthorized, handleRouteError } from "@/lib/http";
import { assertRateLimits, RATE_RULES } from "@/lib/rateLimit";

// 특정 여행에 종속되지 않는 순수 카카오 장소검색 프록시 — 소유권 검사 불필요, 로그인만 확인.
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ candidates: [] });
    }

    // 카카오 호출 전에 사용자별 요청 수부터 센다(서비스 전체 일일 예산은 kakaoClient가 확인)
    await assertRateLimits(
      [{ rule: RATE_RULES.placeSearchPerUserMin, subject: user.id }],
      "장소 검색 요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
    );

    const candidates = await searchPlaceCandidates(q);
    if (candidates === null) {
      return NextResponse.json({ error: "KAKAO_REST_API_KEY 설정이 필요합니다." }, { status: 503 });
    }

    return NextResponse.json({ candidates });
  } catch (err) {
    return handleRouteError(err);
  }
}
