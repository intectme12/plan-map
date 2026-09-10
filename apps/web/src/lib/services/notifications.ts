import { prisma } from "../db";

const NOTIFICATION_PAGE_SIZE = 20;

// 짧은 시간에 언팔로우→재팔로우, 좋아요 취소→재좋아요를 반복해도 안읽은 알림이 계속 쌓이지
// 않도록, 같은 사람/같은 대상(트립)에서 온 안읽은 알림이 이미 있으면 새로 만들지 않는다.
async function createNotificationIfNotDuplicate(data: {
  userId: string;
  actorId: string;
  type: string;
  tripId?: string;
}) {
  if (data.userId === data.actorId) return; // 본인 행동은 알림 안 보냄(자기 트립 좋아요 등)

  const existing = await prisma.notification.findFirst({
    where: { userId: data.userId, actorId: data.actorId, type: data.type, tripId: data.tripId ?? null, readAt: null },
    select: { id: true },
  });
  if (existing) return;

  await prisma.notification.create({ data });
}

export function createFollowNotification(actorId: string, targetUserId: string) {
  return createNotificationIfNotDuplicate({ userId: targetUserId, actorId, type: "FOLLOW" });
}

export function createLikeNotification(actorId: string, tripOwnerId: string, tripId: string) {
  return createNotificationIfNotDuplicate({ userId: tripOwnerId, actorId, type: "LIKE", tripId });
}

export async function listNotifications(userId: string, cursor: number) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: cursor,
    take: NOTIFICATION_PAGE_SIZE,
    include: {
      actor: { select: { nickname: true, avatarUrl: true } },
      trip: { select: { id: true, name: true } },
    },
  });
}

export function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
