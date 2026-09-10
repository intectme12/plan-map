import { prisma } from "../db";
import { NotFoundError } from "../errors";
import { assertTripEditAccess } from "./tripAccess";
import { getReviewsForCoordinates, coordKey } from "./reviews";

export async function listPlaces(userId: string, tripId: string) {
  await assertTripEditAccess(userId, tripId);
  const places = await prisma.placeEntry.findMany({
    where: { tripId },
    orderBy: { order: "asc" },
    include: { expenses: true, photos: true },
  });

  const reviewsByCoord = await getReviewsForCoordinates(places.map((p) => ({ lat: p.lat, lng: p.lng })));
  return places.map((place) => {
    const entry = reviewsByCoord.get(coordKey(place.lat, place.lng)) ?? {
      reviews: [],
      avgRating: null,
      reviewCount: 0,
    };
    return { ...place, reviews: entry.reviews, avgRating: entry.avgRating, reviewCount: entry.reviewCount };
  });
}

type PlaceInput = {
  name: string;
  category?: string;
  lat: number;
  lng: number;
  address?: string;
  roadAddress?: string;
  placeUrl?: string;
  phone?: string;
  scheduledAt?: Date;
};

export async function createPlace(userId: string, tripId: string, data: PlaceInput) {
  await assertTripEditAccess(userId, tripId);
  const last = await prisma.placeEntry.findFirst({
    where: { tripId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return prisma.placeEntry.create({
    data: { ...data, tripId, order: (last?.order ?? 0) + 1 },
  });
}

export async function updatePlace(
  userId: string,
  tripId: string,
  placeId: string,
  data: Partial<PlaceInput> & { order?: number }
) {
  await assertTripEditAccess(userId, tripId);
  const result = await prisma.placeEntry.updateMany({ where: { id: placeId, tripId }, data });
  if (result.count === 0) throw new NotFoundError("장소를 찾을 수 없습니다.");
}

export async function deletePlace(userId: string, tripId: string, placeId: string) {
  await assertTripEditAccess(userId, tripId);
  const result = await prisma.placeEntry.deleteMany({ where: { id: placeId, tripId } });
  if (result.count === 0) throw new NotFoundError("장소를 찾을 수 없습니다.");
}
