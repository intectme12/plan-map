import { prisma } from "../db";
import { NotFoundError } from "../errors";
import { createLikeNotification } from "./notifications";

// 좋아요는 그 여행을 열람할 수 있는 사람만 가능 — getSharedTrip과 동일한 기준(공개/링크공개/오너 본인/공유받음)
async function assertViewableTrip(tripId: string, viewerUserId: string) {
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      OR: [
        { visibility: { in: ["PUBLIC", "UNLISTED"] } },
        { userId: viewerUserId },
        { shares: { some: { userId: viewerUserId } } },
      ],
    },
    select: { id: true, userId: true },
  });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");
  return trip;
}

export async function likeTrip(userId: string, tripId: string) {
  const trip = await assertViewableTrip(tripId, userId);

  const existing = await prisma.tripLike.findUnique({ where: { tripId_userId: { tripId, userId } } });
  if (existing) return;

  await prisma.tripLike.create({ data: { tripId, userId } });
  await createLikeNotification(userId, trip.userId, tripId);
}

export async function unlikeTrip(userId: string, tripId: string) {
  await prisma.tripLike.deleteMany({ where: { tripId, userId } });
}
