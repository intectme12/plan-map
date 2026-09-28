import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listConversations } from "@/lib/services/conversations";
import { countUnreadNotifications } from "@/lib/services/notifications";
import { getFeaturedTripForHome, getTravelStats, listAllPlacesForUser } from "@/lib/services/trips";
import { HomeHeader } from "@/components/home/HomeHeader";
import { TravelStatsCard } from "@/app/trips/TravelStatsCard";
import { SavedPlacesBrowser } from "./SavedPlacesBrowser";

export default async function SavedPlacesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [conversations, unreadNotificationCount, featuredTrip, places, stats] = await Promise.all([
    listConversations(user.id),
    countUnreadNotifications(user.id),
    getFeaturedTripForHome(user.id),
    listAllPlacesForUser(user.id),
    getTravelStats(user.id),
  ]);
  const unreadMessageCount = conversations.filter((c) => c.unread).length;
  const mapHref = featuredTrip ? `/trips/${featuredTrip.id}` : "/trips";
  const aiPlanHref = featuredTrip ? `/trips/${featuredTrip.id}/import` : "/trips";

  const browserPlaces = places.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    roadAddress: p.roadAddress,
    tripId: p.trip.id,
    tripName: p.trip.name,
  }));

  return (
    <main className="min-h-screen bg-slate-50 lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <HomeHeader
        nickname={user.nickname}
        avatarUrl={user.avatarUrl}
        isAdmin={user.role === "ADMIN"}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={unreadMessageCount}
        currentUserId={user.id}
        mapHref={mapHref}
        aiPlanHref={aiPlanHref}
      />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 pb-16 sm:px-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden lg:pb-8">
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">
          저장한 장소 <span className="text-neutral-400">{places.length}</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          내가 만든 여행 계획에 담아둔 장소들을 한눈에 모아봤어요.
        </p>

        <div className="mt-6 lg:flex-none">
          <TravelStatsCard
            tripCount={stats.tripCount}
            savedPlaceCount={stats.savedPlaceCount}
            visitedRegionCount={stats.visitedRegionCount}
          />
        </div>

        {places.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-400">
            아직 저장한 장소가 없어요. 여행 계획에 장소를 추가하면 여기에 모여요.
          </p>
        ) : (
          <SavedPlacesBrowser places={browserPlaces} />
        )}
      </div>
    </main>
  );
}
