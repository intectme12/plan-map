import { prisma } from "../db";

// 여행 상세를 열람할 때마다 호출 — 사람당 여행 하나에 최근 조회 시각 한 건만 유지한다(upsert).
// 열람 권한 자체는 호출하는 쪽(여행 상세 페이지)이 이미 검증했으므로 여기서는 기록만 한다.
export async function recordTripView(userId: string, tripId: string) {
  await prisma.tripView.upsert({
    where: { userId_tripId: { userId, tripId } },
    create: { userId, tripId },
    update: { viewedAt: new Date() },
  });
}

export function listRecentlyViewedTrips(userId: string, limit = 3) {
  return prisma.tripView
    .findMany({
      where: { userId },
      orderBy: { viewedAt: "desc" },
      take: limit,
      include: {
        trip: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            coverPhotoKey: true,
            userId: true,
            _count: { select: { places: true } },
          },
        },
      },
    })
    .then((views) => views.map((v) => v.trip));
}
