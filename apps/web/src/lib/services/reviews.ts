import { prisma } from "../db";
import { NotFoundError } from "../errors";
import { assertPlaceEditAccess } from "./tripAccess";

export async function addReview(userId: string, tripId: string, placeId: string, content: string) {
  await assertPlaceEditAccess(userId, tripId, placeId);
  return prisma.review.create({
    data: { placeEntryId: placeId, authorId: userId, content },
    include: { author: { select: { nickname: true } } },
  });
}

export async function deleteReview(userId: string, tripId: string, placeId: string, reviewId: string) {
  await assertPlaceEditAccess(userId, tripId, placeId);

  const review = await prisma.review.findFirst({ where: { id: reviewId, placeEntryId: placeId } });
  if (!review) throw new NotFoundError("후기를 찾을 수 없습니다.");

  await prisma.review.delete({ where: { id: reviewId } });
}
