import { prisma } from "../db";

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
  data: Partial<{ name: string; startDate: Date; endDate: Date; personnel: number }>
) {
  const result = await prisma.trip.updateMany({ where: { id: tripId, userId }, data });
  return result.count > 0;
}

export async function deleteTrip(userId: string, tripId: string) {
  const result = await prisma.trip.deleteMany({ where: { id: tripId, userId } });
  return result.count > 0;
}
