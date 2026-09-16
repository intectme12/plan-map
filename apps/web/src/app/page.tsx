import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listConversations } from "@/lib/services/conversations";
import { countUnreadNotifications } from "@/lib/services/notifications";
import { getFeaturedTripForHome, listPopularSharedTrips } from "@/lib/services/trips";
import { todaysDestination } from "@/lib/destinations";
import { fetchCurrentWeather } from "@/lib/weather";
import { tripCategories } from "@/lib/validation";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeHero } from "@/components/home/HomeHero";
import { CategoryNav } from "@/components/home/CategoryNav";
import { RecommendedDestinations } from "@/components/home/RecommendedDestinations";
import { MyTripsPanel } from "@/components/home/MyTripsPanel";
import { QuickStartCards } from "@/components/home/QuickStartCards";
import { RecentlyViewed } from "@/components/home/RecentlyViewed";
import { AIPlanCTA } from "@/components/home/AIPlanCTA";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { category: rawCategory } = await searchParams;
  const category = tripCategories.includes(rawCategory as (typeof tripCategories)[number])
    ? rawCategory
    : undefined;

  const destination = todaysDestination();

  const [conversations, unreadNotificationCount, featuredTrip, topTrips, weather] = await Promise.all([
    listConversations(user.id),
    countUnreadNotifications(user.id),
    getFeaturedTripForHome(user.id),
    listPopularSharedTrips(undefined, user.id, 1),
    fetchCurrentWeather(destination.lat, destination.lng),
  ]);
  const unreadMessageCount = conversations.filter((c) => c.unread).length;

  const mapHref = featuredTrip ? `/trips/${featuredTrip.id}` : "/trips";
  const aiPlanHref = featuredTrip ? `/trips/${featuredTrip.id}/import` : "/trips";

  return (
    <main className="min-h-screen bg-slate-50">
      <HomeHeader
        active="home"
        nickname={user.nickname}
        avatarUrl={user.avatarUrl}
        isAdmin={user.role === "ADMIN"}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={unreadMessageCount}
        currentUserId={user.id}
        mapHref={mapHref}
        aiPlanHref={aiPlanHref}
      />

      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6">
        <HomeHero destination={destination} weather={weather} heroImageUrl={topTrips[0]?.coverPhotoKey ?? null} />

        <CategoryNav active={category} />

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          <RecommendedDestinations userId={user.id} category={category} />

          <div className="flex flex-col gap-10">
            <MyTripsPanel trip={featuredTrip} />
            <QuickStartCards mapHref={mapHref} aiPlanHref={aiPlanHref} />
            <RecentlyViewed userId={user.id} />
          </div>
        </div>

        <AIPlanCTA href={aiPlanHref} />
      </div>
    </main>
  );
}
