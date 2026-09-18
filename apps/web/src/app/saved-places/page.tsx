import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listConversations } from "@/lib/services/conversations";
import { countUnreadNotifications } from "@/lib/services/notifications";
import { getFeaturedTripForHome, listAllPlacesForUser } from "@/lib/services/trips";
import { HomeHeader } from "@/components/home/HomeHeader";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";

export default async function SavedPlacesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [conversations, unreadNotificationCount, featuredTrip, places] = await Promise.all([
    listConversations(user.id),
    countUnreadNotifications(user.id),
    getFeaturedTripForHome(user.id),
    listAllPlacesForUser(user.id),
  ]);
  const unreadMessageCount = conversations.filter((c) => c.unread).length;
  const mapHref = featuredTrip ? `/trips/${featuredTrip.id}` : "/trips";
  const aiPlanHref = featuredTrip ? `/trips/${featuredTrip.id}/import` : "/trips";

  const tripGroups = new Map<string, { tripId: string; tripName: string; places: typeof places }>();
  for (const place of places) {
    const group = tripGroups.get(place.trip.id);
    if (group) group.places.push(place);
    else tripGroups.set(place.trip.id, { tripId: place.trip.id, tripName: place.trip.name, places: [place] });
  }

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

      <div className="mx-auto max-w-[1440px] px-4 py-8 pb-16 sm:px-6">
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">
          저장한 장소 <span className="text-neutral-400">{places.length}</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          내가 만든 여행 계획에 담아둔 장소들을 한눈에 모아봤어요.
        </p>

        {places.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-400">
            아직 저장한 장소가 없어요. 여행 계획에 장소를 추가하면 여기에 모여요.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
            <div className="h-[420px] overflow-hidden rounded-2xl border border-neutral-100 shadow-[0_2px_12px_rgba(15,23,42,0.06)] lg:h-auto">
              <KakaoMapCanvas
                points={places.map((p) => ({
                  id: p.id,
                  name: p.name,
                  lat: p.lat,
                  lng: p.lng,
                  category: p.trip.name,
                  address: p.address ?? p.roadAddress ?? undefined,
                }))}
              />
            </div>

            <div className="flex flex-col gap-4">
              {[...tripGroups.values()].map((group) => (
                <div key={group.tripId} className="rounded-2xl border border-neutral-100 bg-white p-4">
                  <Link
                    href={`/trips/${group.tripId}`}
                    className="text-sm font-semibold text-neutral-900 hover:text-blue-600"
                  >
                    {group.tripName}
                  </Link>
                  <ul className="mt-2 flex flex-col gap-2">
                    {group.places.map((place) => (
                      <li key={place.id} className="flex items-start gap-2 text-xs text-neutral-600">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-neutral-400" />
                        <span className="min-w-0">
                          <span className="block font-medium text-neutral-800">{place.name}</span>
                          {place.address || place.roadAddress ? (
                            <span className="block truncate text-neutral-400">
                              {place.address ?? place.roadAddress}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
