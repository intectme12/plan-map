import { prisma } from "../db";
import { NotFoundError } from "../errors";

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
    select: { id: true },
  });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");
}

export async function likeTrip(userId: string, tripId: string) {
  await assertViewableTrip(tripId, userId);

  await prisma.tripLike.upsert({
    where: { tripId_userId: { tripId, userId } },
    create: { tripId, userId },
    update: {},
  });
}

export async function unlikeTrip(userId: string, tripId: string) {
  await prisma.tripLike.deleteMany({ where: { tripId, userId } });
}
