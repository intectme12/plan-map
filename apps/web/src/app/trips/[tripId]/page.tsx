import { notFound, redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getTrip } from "@/lib/services/trips";
import { recordTripView } from "@/lib/services/tripViews";
import { listConversations } from "@/lib/services/conversations";
import { countUnreadNotifications } from "@/lib/services/notifications";
import { HomeHeader } from "@/components/home/HomeHeader";
import { TripWorkspace } from "./TripWorkspace";

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { tripId } = await params;
  const { tab } = await searchParams;
  const activeTab =
    tab === "expense" || tab === "photos" || tab === "reviews" ? tab : "timeline";

  const trip = await getTrip(user.id, tripId);
  if (!trip) notFound();

  await recordTripView(user.id, tripId);

  const [conversations, unreadNotificationCount] = await Promise.all([
    listConversations(user.id),
    countUnreadNotifications(user.id),
  ]);
  const unreadMessageCount = conversations.filter((c) => c.unread).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <HomeHeader
        nickname={user.nickname}
        avatarUrl={user.avatarUrl}
        isAdmin={isAdmin(user)}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={unreadMessageCount}
        currentUserId={user.id}
        mapHref={`/trips/${tripId}`}
        aiPlanHref={`/trips/${tripId}/import`}
      />
      <TripWorkspace
        trip={{
          id: trip.id,
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          personnel: trip.personnel,
          visibility: trip.visibility,
          coverPhotoKey: trip.coverPhotoKey,
          ownerNickname: trip.user.nickname,
        }}
        places={trip.places}
        activeTab={activeTab}
        isOwner={trip.userId === user.id}
        currentUserId={user.id}
      />
    </main>
  );
}
