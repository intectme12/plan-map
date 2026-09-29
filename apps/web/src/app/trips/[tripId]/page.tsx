import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getTrip } from "@/lib/services/trips";
import { recordTripView } from "@/lib/services/tripViews";
import { countUnreadConversations } from "@/lib/services/conversations";
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

  // 여행 조회와 헤더 배지 조회는 서로 기다릴 필요가 없어 동시에 보낸다(원격 DB 왕복 절약)
  const [trip, unreadMessageCount, unreadNotificationCount] = await Promise.all([
    getTrip(user.id, tripId),
    countUnreadConversations(user.id),
    countUnreadNotifications(user.id),
  ]);
  if (!trip) notFound();

  // 최근 본 여행 기록은 화면에 필요 없는 부수 작업이라 응답을 보낸 뒤 저장한다.
  // after()는 notFound() 뒤에도 실행되므로 반드시 권한 확인(위 notFound) 이후에 등록.
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
          tags: trip.tags,
        }}
        places={trip.places}
        activeTab={activeTab}
        isOwner={trip.userId === user.id}
        currentUserId={user.id}
      />
    </main>
  );
}
