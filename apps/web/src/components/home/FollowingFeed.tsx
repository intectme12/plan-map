import Link from "next/link";
import { listRecentFollowingTrips } from "@/lib/services/trips";
import { DestinationCard } from "./DestinationCard";

// 홈 화면에서 "추천 여행지"와 반씩 나눠 쓰는 섹션 — 카드/그리드 형태는 RecommendedGrid.tsx와 같게 맞춘다.
// 카테고리 필터(CategoryNav)는 추천 여행지에만 적용하고, 여기는 항상 최신순이다.
export async function FollowingFeed({ userId }: { userId: string }) {
  const trips = await listRecentFollowingTrips(userId, 6);

  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">내 팔로잉 피드</h2>
          <p className="mt-1 text-sm text-neutral-500">팔로우한 사람들의 새 여행기를 확인해보세요.</p>
        </div>
        <Link href="/trips?tab=following" className="text-xs font-medium text-neutral-500 hover:text-blue-600">
          전체보기 →
        </Link>
      </div>

      {trips.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-400">
          팔로우한 사람의 공개 여행이 아직 없어요.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <DestinationCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </section>
  );
}
