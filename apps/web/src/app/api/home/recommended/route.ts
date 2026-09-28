import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listPopularSharedTrips } from "@/lib/services/trips";
import { tripCategories } from "@/lib/validation";
import { handleRouteError } from "@/lib/http";

// 홈 화면 카테고리 탭(CategoryNav.tsx) 클릭용 — 로그인 여부와 무관하게(게스트 홈에도 같은
// 섹션이 있음) 카테고리별 인기 여행지를 다시 가져온다. 페이지 전체를 새로고침하지 않도록
// RecommendedGrid.tsx가 여기로 클라이언트에서 fetch한다.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    const { searchParams } = new URL(request.url);
    const rawCategory = searchParams.get("category") ?? undefined;
    const category = tripCategories.includes(rawCategory as (typeof tripCategories)[number])
      ? rawCategory
      : undefined;

    const trips = await listPopularSharedTrips(category, user?.id, 8);
    return NextResponse.json(trips);
  } catch (err) {
    return handleRouteError(err);
  }
}
