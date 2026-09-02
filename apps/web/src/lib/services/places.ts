import { prisma } from "../db";
import { NotFoundError } from "../errors";

async function assertTripOwnership(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId }, select: { id: true } });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");
}

export async function listPlaces(userId: string, tripId: string) {
  await assertTripOwnership(userId, tripId);
  return prisma.placeEntry.findMany({
    where: { tripId },
    orderBy: { order: "asc" },
    include: { expenses: true, photos: true },
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
  scheduledAt?: Date;
};

export async function createPlace(userId: string, tripId: string, data: PlaceInput) {
  await assertTripOwnership(userId, tripId);
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
  data: Partial<PlaceInput> & { order?: number; transportToNext?: string }
) {
  await assertTripOwnership(userId, tripId);
  const result = await prisma.placeEntry.updateMany({ where: { id: placeId, tripId }, data });
  if (result.count === 0) throw new NotFoundError("장소를 찾을 수 없습니다.");
}

export async function deletePlace(userId: string, tripId: string, placeId: string) {
  await assertTripOwnership(userId, tripId);
  const result = await prisma.placeEntry.deleteMany({ where: { id: placeId, tripId } });
  if (result.count === 0) throw new NotFoundError("장소를 찾을 수 없습니다.");
}
