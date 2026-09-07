import { prisma } from "../db";
import { NotFoundError } from "../errors";
import { assertTripEditAccess } from "./tripAccess";

export async function listPlaces(userId: string, tripId: string) {
  await assertTripEditAccess(userId, tripId);
  return prisma.placeEntry.findMany({
    where: { tripId },
    orderBy: { order: "asc" },
    include: {
      expenses: true,
      photos: true,
      reviews: { include: { author: { select: { nickname: true } } }, orderBy: { createdAt: "desc" } },
    },
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
  rating?: number;
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
