import { listPopularSharedTrips } from "@/lib/services/trips";
import { RecommendedGrid } from "./RecommendedGrid";

// 첫 렌더용 서버 fetch만 담당 — 카테고리를 바꾼 이후의 재조회는 RecommendedGrid.tsx가
// 클라이언트에서 맡는다(페이지 새로고침/스크롤 이동 없이 그리드만 갱신하기 위함).
export async function RecommendedDestinations({
  userId,
  category,
}: {
  userId?: string;
  category?: string;
}) {
  const trips = await listPopularSharedTrips(category, userId, 8);

  return <RecommendedGrid initialTrips={trips} initialCategory={category} viewerLoggedIn={!!userId} />;
}
