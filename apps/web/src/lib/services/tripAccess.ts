import { prisma } from "../db";
import { NotFoundError } from "../errors";

// 오너 본인이거나, 오너가 닉네임으로 공유(TripShare)한 회원이면 전체 수정 권한을 준다.
export async function assertTripEditAccess(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, OR: [{ userId }, { shares: { some: { userId } } }] },
    select: { id: true },
  });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");
}

export async function assertPlaceEditAccess(userId: string, tripId: string, placeId: string) {
  const place = await prisma.placeEntry.findFirst({
    where: { id: placeId, tripId, trip: { OR: [{ userId }, { shares: { some: { userId } } }] } },
    select: { id: true },
  });
  if (!place) throw new NotFoundError("장소를 찾을 수 없습니다.");
}
