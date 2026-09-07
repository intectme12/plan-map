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
    visibility: string;
  }>
) {
  const payload: typeof data & { sharedAt?: Date } = { ...data };
  if (data.visibility && data.visibility !== "PRIVATE") payload.sharedAt = new Date();

  const result = await prisma.trip.updateMany({ where: { id: tripId, userId }, data: payload });
  return result.count > 0;
}

export async function deleteTrip(userId: string, tripId: string) {
  const result = await prisma.trip.deleteMany({ where: { id: tripId, userId } });
  return result.count > 0;
}

// userId(특정 회원 필터)가 있고 그 회원이 여행목록을 비공개로 설정했다면, 본인이 보는 게 아닌 한 빈 목록을 돌려준다
// (프로필 페이지의 최초 렌더뿐 아니라 이 API를 직접 호출하는 "더보기" 페이지네이션에서도 새어나가지 않도록 서비스 레이어에서 막는다)
export async function listSharedTrips(
  q: string | undefined,
  cursor: number,
  userId?: string,
  viewerUserId?: string
) {
  if (userId && userId !== viewerUserId) {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { showTripsOnProfile: true },
    });
    if (!target || !target.showTripsOnProfile) return [];
  }

  const term = q?.trim();

  return prisma.trip.findMany({
    where: {
      visibility: "PUBLIC",
      ...(userId ? { userId } : {}),
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
      user: { select: { nickname: true, avatarUrl: true } },
      _count: { select: { places: true } },
    },
  });
}

// 링크 전용/특정 회원 지정 공유는 목록에 안 뜨므로, id를 아는 사람이 직접 열람할 때만 이 함수를 거친다
export function getSharedTrip(tripId: string, viewerUserId: string) {
  return prisma.trip.findFirst({
    where: {
      id: tripId,
      OR: [
        { visibility: { in: ["PUBLIC", "UNLISTED"] } },
        { userId: viewerUserId },
        { shares: { some: { userId: viewerUserId } } },
      ],
    },
    include: {
      user: { select: { nickname: true } },
      places: {
        orderBy: { order: "asc" },
        include: { expenses: true, photos: true },
      },
    },
  });
}

// 특정 회원에게만 공유된(PRIVATE+TripShare) 트립은 더 사적인 공유로 보고 복사는 막고 열람만 허용한다
export async function copyTrip(userId: string, sourceTripId: string) {
  const source = await prisma.trip.findFirst({
    where: { id: sourceTripId, visibility: { in: ["PUBLIC", "UNLISTED"] } },
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

export function listTripsSharedWithMe(userId: string, cursor: number) {
  return prisma.trip.findMany({
    where: { shares: { some: { userId } } },
    orderBy: { sharedAt: "desc" },
    skip: cursor,
    take: SHARED_PAGE_SIZE,
    include: {
      user: { select: { nickname: true, avatarUrl: true } },
      _count: { select: { places: true } },
    },
  });
}

export function listTripShares(ownerId: string, tripId: string) {
  return prisma.tripShare.findMany({
    where: { tripId, trip: { userId: ownerId } },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
  });
}

export async function shareTrip(ownerId: string, tripId: string, nickname: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId: ownerId } });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");

  const target = await prisma.user.findUnique({ where: { nickname } });
  if (!target) throw new NotFoundError("존재하지 않는 회원입니다.");
  if (target.id === ownerId) throw new NotFoundError("자기 자신에게는 공유할 수 없습니다.");

  return prisma.tripShare.upsert({
    where: { tripId_userId: { tripId, userId: target.id } },
    create: { tripId, userId: target.id },
    update: {},
    include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
  });
}

export async function unshareTrip(ownerId: string, tripId: string, targetUserId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId: ownerId } });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");

  await prisma.tripShare.deleteMany({ where: { tripId, userId: targetUserId } });
}
