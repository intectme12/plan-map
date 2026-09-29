import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getSharedTrip } from "@/lib/services/trips";
import { recordTripView } from "@/lib/services/tripViews";
import { countUnreadConversations } from "@/lib/services/conversations";
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

  // 여행 조회와 헤더 배지 조회는 서로 기다릴 필요가 없어 동시에 보낸다(원격 DB 왕복 절약)
  const [trip, unreadMessageCount, unreadNotificationCount] = await Promise.all([
    getSharedTrip(tripId, user.id),
    countUnreadConversations(user.id),
    countUnreadNotifications(user.id),
  ]);
  if (!trip) notFound();

  // 최근 본 여행 기록은 응답을 보낸 뒤 저장(after는 notFound 뒤에도 실행되므로 권한 확인 이후에 등록)
  after(() => recordTripView(user.id, tripId));

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
