import { prisma } from "../db";
import { NotFoundError } from "../errors";

async function assertPlaceOwnership(userId: string, tripId: string, placeId: string) {
  const place = await prisma.placeEntry.findFirst({
    where: { id: placeId, tripId, trip: { userId } },
    select: { id: true },
  });
  if (!place) throw new NotFoundError("장소를 찾을 수 없습니다.");
}

export async function addReview(userId: string, tripId: string, placeId: string, content: string) {
  await assertPlaceOwnership(userId, tripId, placeId);
  return prisma.review.create({ data: { placeEntryId: placeId, content } });
}

export async function deleteReview(userId: string, tripId: string, placeId: string, reviewId: string) {
  await assertPlaceOwnership(userId, tripId, placeId);

  const review = await prisma.review.findFirst({ where: { id: reviewId, placeEntryId: placeId } });
  if (!review) throw new NotFoundError("후기를 찾을 수 없습니다.");

  await prisma.review.delete({ where: { id: reviewId } });
}
