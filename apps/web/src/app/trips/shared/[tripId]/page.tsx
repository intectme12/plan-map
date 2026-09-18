import { notFound, redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getSharedTrip } from "@/lib/services/trips";
import { recordTripView } from "@/lib/services/tripViews";
import { listConversations } from "@/lib/services/conversations";
import { countUnreadNotifications } from "@/lib/services/notifications";
import { HomeHeader } from "@/components/home/HomeHeader";
import { SharedTripView } from "./SharedTripView";

export default async function SharedTripDetailPage({
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

  const trip = await getSharedTrip(tripId, user.id);
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
        mapHref={`/trips/shared/${tripId}`}
        aiPlanHref={trip.userId === user.id ? `/trips/${tripId}/import` : "/trips"}
      />
      <SharedTripView
        trip={{
          id: trip.id,
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          personnel: trip.personnel,
          visibility: trip.visibility,
          coverPhotoKey: trip.coverPhotoKey,
          ownerNickname: trip.user.nickname,
          likeCount: trip.likeCount,
          likedByMe: trip.likedByMe,
        }}
        places={trip.places}
        activeTab={activeTab}
        isOwnTrip={trip.userId === user.id}
      />
    </main>
  );
}
