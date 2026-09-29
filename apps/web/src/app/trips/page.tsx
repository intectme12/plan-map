import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import {
  listTrips,
  getFeaturedTripForHome,
  getTravelStats,
  getMapOverviewForUser,
  tripSortOptions,
  type TripSortOption,
} from "@/lib/services/trips";
import { countUnreadConversations } from "@/lib/services/conversations";
import { getFollowState } from "@/lib/services/follows";
import { countUnreadNotifications } from "@/lib/services/notifications";
import { HomeHeader } from "@/components/home/HomeHeader";
import { RecentlyViewed } from "@/components/home/RecentlyViewed";
import { QuickStartCards } from "@/components/home/QuickStartCards";
import { AIPlanCTA } from "@/components/home/AIPlanCTA";
import { TripsProfileHero } from "./TripsProfileHero";
import { TripsTabs } from "./TripsTabs";
import { TravelStatsCard } from "./TravelStatsCard";
import { AllTripsMapWidget } from "./AllTripsMapWidget";

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { sort: rawSort } = await searchParams;
  const sort: TripSortOption = tripSortOptions.includes(rawSort as TripSortOption)
    ? (rawSort as TripSortOption)
    : "latest";

  const [trips, unreadMessageCount, followState, unreadNotificationCount, featuredTrip, stats, mapOverview] =
    await Promise.all([
      listTrips(user.id, sort),
      countUnreadConversations(user.id),
      getFollowState(user.id, user.id),
      countUnreadNotifications(user.id),
      getFeaturedTripForHome(user.id),
      getTravelStats(user.id),
      getMapOverviewForUser(user.id),
    ]);
  const mapHref = featuredTrip ? `/trips/${featuredTrip.id}` : "/trips";
  // 이미 만든 여행이 있어도 홈/메인 진입점은 항상 "새 여행 만들기"로 보낸다 — 기존 여행에
  // 이어서 추가하는 건 그 여행 상세 화면 안의 AI 카드(AIAssistantCard)가 보조 기능으로 맡는다.
  const aiPlanHref = "/trips/new/import";
  const heroBackground = trips.find((t) => t.coverPhotoKey)?.coverPhotoKey ?? null;

  return (
    <main className="min-h-screen bg-slate-50">
      <HomeHeader
        nickname={user.nickname}
        avatarUrl={user.avatarUrl}
        isAdmin={isAdmin(user)}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={unreadMessageCount}
        currentUserId={user.id}
        mapHref={mapHref}
        aiPlanHref={aiPlanHref}
      />

      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6">
        <TripsProfileHero
          nickname={user.nickname}
          avatarUrl={user.avatarUrl}
          bio={user.bio}
          followerCount={followState.followerCount}
          followingCount={followState.followingCount}
          backgroundImageUrl={heroBackground}
        />

        <TripsTabs
          trips={trips}
          sort={sort}
          nickname={user.nickname}
          avatarUrl={user.avatarUrl}
          aiBanner={<AIPlanCTA href={aiPlanHref} />}
          sidebar={
            <>
              <TravelStatsCard
                tripCount={stats.tripCount}
                savedPlaceCount={stats.savedPlaceCount}
                visitedRegionCount={stats.visitedRegionCount}
              />
              <QuickStartCards mapHref={mapHref} aiPlanHref={aiPlanHref} />
              <AllTripsMapWidget
                points={mapOverview.points}
                tripCount={mapOverview.tripCount}
                placeCount={mapOverview.placeCount}
              />
              <RecentlyViewed userId={user.id} />
            </>
          }
        />
      </div>
    </main>
  );
}
