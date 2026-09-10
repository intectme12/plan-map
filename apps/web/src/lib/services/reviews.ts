import { prisma } from "../db";
import { NotFoundError, ForbiddenError } from "../errors";

// 좌표(lat/lng)로 실제 장소를 식별해 트립/PlaceEntry 경계를 넘어 후기를 전체공개한다 — schema.prisma의
// Review 모델 주석 참고. 작성 자격은 "이 좌표의 장소를 자기 트립(오너 또는 공유받은 편집권한)에 추가해본 사람"이고,
// assertPlaceEditAccess와 동일한 조건으로 그 PlaceEntry의 좌표를 함께 조회해 증명한다.
export async function upsertReview(
  userId: string,
  tripId: string,
  placeId: string,
  data: { rating: number; content: string }
) {
  const place = await prisma.placeEntry.findFirst({
    where: { id: placeId, tripId, trip: { OR: [{ userId }, { shares: { some: { userId } } }] } },
    select: { lat: true, lng: true },
  });
  if (!place) throw new NotFoundError("장소를 찾을 수 없습니다.");

  return prisma.review.upsert({
    where: { authorId_lat_lng: { authorId: userId, lat: place.lat, lng: place.lng } },
    create: { authorId: userId, lat: place.lat, lng: place.lng, ...data },
    update: data,
    include: { author: { select: { nickname: true } } },
  });
}

// 카카오/네이버처럼 본인이 쓴 후기만 본인이 지울 수 있다 — 트립 편집권한과 무관.
export async function deleteReview(userId: string, reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { authorId: true } });
  if (!review) throw new NotFoundError("후기를 찾을 수 없습니다.");
  if (review.authorId !== userId) throw new ForbiddenError("본인이 작성한 후기만 삭제할 수 있습니다.");

  await prisma.review.delete({ where: { id: reviewId } });
}

export type ReviewsByCoordinate = Map<
  string,
  {
    reviews: { id: string; content: string; rating: number; createdAt: Date; authorId: string; author: { nickname: string } }[];
    avgRating: number | null;
    reviewCount: number;
  }
>;

export function coordKey(lat: number, lng: number) {
  return `${lat},${lng}`;
}

// 여러 장소(좌표)의 후기를 한 번의 쿼리로 모아서 좌표별로 그룹핑 — N+1 방지.
export async function getReviewsForCoordinates(
  places: { lat: number; lng: number }[]
): Promise<ReviewsByCoordinate> {
  const result: ReviewsByCoordinate = new Map();
  if (places.length === 0) return result;

  const reviews = await prisma.review.findMany({
    where: { OR: places.map((p) => ({ lat: p.lat, lng: p.lng })) },
    include: { author: { select: { nickname: true } } },
    orderBy: { createdAt: "desc" },
  });

  for (const place of places) {
    const key = coordKey(place.lat, place.lng);
    if (!result.has(key)) result.set(key, { reviews: [], avgRating: null, reviewCount: 0 });
  }

  for (const review of reviews) {
    const entry = result.get(coordKey(review.lat, review.lng));
    entry?.reviews.push(review);
  }

  for (const entry of result.values()) {
    entry.reviewCount = entry.reviews.length;
    entry.avgRating =
      entry.reviews.length > 0
        ? entry.reviews.reduce((sum, r) => sum + r.rating, 0) / entry.reviews.length
        : null;
  }

  return result;
}
