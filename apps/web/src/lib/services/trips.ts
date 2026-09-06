import { prisma } from "../db";
import { NotFoundError } from "../errors";

const SHARED_PAGE_SIZE = 20;

export function listTrips(userId: string) {
  return prisma.trip.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { places: true } } },
  });
}

export function createTrip(
  userId: string,
  data: { name: string; startDate: Date; endDate: Date; personnel: number }
) {
  return prisma.trip.create({ data: { ...data, userId } });
}

export function getTrip(userId: string, tripId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, userId },
    include: {
      places: {
        orderBy: { order: "asc" },
        include: { expenses: true, photos: true },
      },
    },
  });
}

export async function updateTrip(
  userId: string,
  tripId: string,
  data: Partial<{
    name: string;
    startDate: Date;
    endDate: Date;
    personnel: number;
    isPublic: boolean;
  }>
) {
  const payload: typeof data & { sharedAt?: Date } = { ...data };
  if (data.isPublic === true) payload.sharedAt = new Date();

  const result = await prisma.trip.updateMany({ where: { id: tripId, userId }, data: payload });
  return result.count > 0;
}

export async function deleteTrip(userId: string, tripId: string) {
  const result = await prisma.trip.deleteMany({ where: { id: tripId, userId } });
  return result.count > 0;
}

export function listSharedTrips(q: string | undefined, cursor: number) {
  const term = q?.trim();

  return prisma.trip.findMany({
    where: {
      isPublic: true,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              {
                places: {
                  some: {
                    OR: [
                      { name: { contains: term, mode: "insensitive" } },
                      { address: { contains: term, mode: "insensitive" } },
                      { roadAddress: { contains: term, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { sharedAt: "desc" },
    skip: cursor,
    take: SHARED_PAGE_SIZE,
    include: {
      user: { select: { nickname: true } },
      _count: { select: { places: true } },
    },
  });
}

export function getSharedTrip(tripId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, isPublic: true },
    include: {
      user: { select: { nickname: true } },
      places: {
        orderBy: { order: "asc" },
        include: { expenses: true, photos: true },
      },
    },
  });
}

export async function copyTrip(userId: string, sourceTripId: string) {
  const source = await prisma.trip.findFirst({
    where: { id: sourceTripId, isPublic: true },
    include: { places: { orderBy: { order: "asc" } } },
  });
  if (!source) throw new NotFoundError("복사할 여행을 찾을 수 없습니다.");

  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        userId,
        name: `${source.name} (복사본)`,
        startDate: source.startDate,
        endDate: source.endDate,
        personnel: source.personnel,
      },
    });

    if (source.places.length > 0) {
      await tx.placeEntry.createMany({
        data: source.places.map((p) => ({
          tripId: trip.id,
          order: p.order,
          name: p.name,
          category: p.category,
          lat: p.lat,
          lng: p.lng,
          address: p.address,
          roadAddress: p.roadAddress,
          placeUrl: p.placeUrl,
          phone: p.phone,
          scheduledAt: p.scheduledAt,
        })),
      });
    }

    return trip;
  });
}
