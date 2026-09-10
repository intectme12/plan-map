import { prisma } from "../db";

const NOTIFICATION_PAGE_SIZE = 20;

// 짧은 시간에 언팔로우→재팔로우를 반복해도 안읽은 "OO님이 팔로우하였습니다" 알림이 계속 쌓이지
// 않도록, 같은 사람에게서 온 안읽은 FOLLOW 알림이 이미 있으면 새로 만들지 않는다.
export async function createFollowNotification(actorId: string, targetUserId: string) {
  const existing = await prisma.notification.findFirst({
    where: { userId: targetUserId, actorId, type: "FOLLOW", readAt: null },
    select: { id: true },
  });
  if (existing) return;

  await prisma.notification.create({
    data: { userId: targetUserId, actorId, type: "FOLLOW" },
  });
}

export async function listNotifications(userId: string, cursor: number) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: cursor,
    take: NOTIFICATION_PAGE_SIZE,
    include: { actor: { select: { nickname: true, avatarUrl: true } } },
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
