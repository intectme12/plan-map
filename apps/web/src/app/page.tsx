import { getCurrentUser } from "@/lib/auth";
import { countUnreadConversations } from "@/lib/services/conversations";
import { countUnreadNotifications } from "@/lib/services/notifications";
import { getFeaturedTripForHome } from "@/lib/services/trips";
import { todaysDestination } from "@/lib/destinations";
import { fetchCurrentWeather } from "@/lib/weather";
import { tripCategories } from "@/lib/validation";
import { HomeHeader } from "@/components/home/HomeHeader";
import { GuestHomeHeader } from "@/components/home/GuestHomeHeader";
import { HomeHero } from "@/components/home/HomeHero";
import { GuestHeroSearchBox } from "@/components/home/GuestHeroSearchBox";
import { HomeCategoryProvider } from "@/components/home/HomeCategoryProvider";
import { CategoryNav } from "@/components/home/CategoryNav";
import { RecommendedDestinations } from "@/components/home/RecommendedDestinations";
import { MyTripsPanel } from "@/components/home/MyTripsPanel";
import { QuickStartCards } from "@/components/home/QuickStartCards";
import { RecentlyViewed } from "@/components/home/RecentlyViewed";
import { AIPlanCTA } from "@/components/home/AIPlanCTA";
import { GuestAIPlanButton } from "@/components/home/GuestAIPlanButton";
import { LoginPopupProvider } from "@/components/auth/LoginPopupContext";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await getCurrentUser();

  const { category: rawCategory } = await searchParams;
  const category = tripCategories.includes(rawCategory as (typeof tripCategories)[number])
    ? rawCategory
    : undefined;

  const destination = todaysDestination();

  if (!user) {
    const weather = await fetchCurrentWeather(destination.lat, destination.lng);

    return (
      <LoginPopupProvider>
        <main className="min-h-screen bg-slate-50">
          <GuestHomeHeader />

          <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6">
            <HomeHero destination={destination} weather={weather} searchBox={<GuestHeroSearchBox />} />

            <HomeCategoryProvider initialCategory={category}>
              <CategoryNav />
              <RecommendedDestinations category={category} />
            </HomeCategoryProvider>

            <AIPlanCTA cta={<GuestAIPlanButton />} />
          </div>
        </main>
      </LoginPopupProvider>
    );
  }

  const [unreadMessageCount, unreadNotificationCount, featuredTrip, weather] = await Promise.all([
    countUnreadConversations(user.id),
    countUnreadNotifications(user.id),
    getFeaturedTripForHome(user.id),
    fetchCurrentWeather(destination.lat, destination.lng),
  ]);

  const mapHref = featuredTrip ? `/trips/${featuredTrip.id}` : "/trips";
  const aiPlanHref = featuredTrip ? `/trips/${featuredTrip.id}/import` : "/trips";

  return (
    <main className="min-h-screen bg-slate-50">
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

      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6">
        <HomeHero destination={destination} weather={weather} />

        <HomeCategoryProvider initialCategory={category}>
          <CategoryNav />

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
            <RecommendedDestinations userId={user.id} category={category} />

            <div className="flex flex-col gap-10">
              <MyTripsPanel trip={featuredTrip} />
              <QuickStartCards mapHref={mapHref} aiPlanHref={aiPlanHref} />
              <RecentlyViewed userId={user.id} />
            </div>
          </div>
        </HomeCategoryProvider>

        <AIPlanCTA href={aiPlanHref} />
      </div>
    </main>
  );
}
