// /notifications 페이지와 상단 알림 팝업(HomeNotificationBell)이 같이 쓰는 표시 로직.
// 알림 문구/이동 경로 규칙이 두 곳에서 어긋나지 않도록 여기 한 곳에만 둔다.

export type NotificationItem = {
  id: string;
  type: string;
  createdAt: string | Date;
  readAt: string | Date | null;
  actor: { nickname: string; avatarUrl: string | null };
  trip: { id: string; name: string } | null;
};

export function formatNotificationDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function notificationText(n: Pick<NotificationItem, "type" | "trip">) {
  if (n.type === "FOLLOW") return "님이 팔로우하였습니다";
  if (n.type === "LIKE") return `님이 회원님의 여행계획 "${n.trip?.name ?? ""}"을(를) 좋아합니다`;
  return "새 알림이 있습니다";
}

// 팔로우 알림은 상대 프로필로, 좋아요 알림은 좋아요 받은 내 여행계획으로 이동한다.
export function notificationHref(n: Pick<NotificationItem, "type" | "trip" | "actor">) {
  if (n.type === "LIKE" && n.trip) return `/trips/${n.trip.id}`;
  return `/users/${n.actor.nickname}`;
}
