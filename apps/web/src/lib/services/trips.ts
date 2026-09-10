import { prisma } from "../db";
import { NotFoundError, ForbiddenError } from "../errors";
import { saveImageFile, deleteStoredFile } from "../upload";
import { getReviewsForCoordinates, coordKey } from "./reviews";

const SHARED_PAGE_SIZE = 20;

// 후기는 더 이상 PlaceEntry에 딸린 관계가 아니라 좌표로 조회하는 별도 테이블이라, Prisma include로
// 못 가져오고 조회 후 한 번에 배치 조회해서 붙여준다(reviews.ts의 getReviewsForCoordinates 참고).
async function attachReviews<T extends { lat: number; lng: number }>(places: T[]) {
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

// 목록 조회 결과에 딸려온 _count.likes/likes(내가 눌렀는지 확인용 1건)를 카드가 바로 쓸 수 있는
// likeCount/likedByMe로 펼치고, 원본 likes 배열은 응답에서 뺀다(클라이언트가 알 필요 없음)
function withLikeInfo<T extends { _count: { places: number; likes: number }; likes: { id: string }[] }>(
  trip: T
) {
  const { likes, _count, ...rest } = trip;
  return { ...rest, _count: { places: _count.places }, likeCount: _count.likes, likedByMe: likes.length > 0 };
}

const likesInclude = (viewerUserId: string | undefined) => ({
  _count: { select: { places: true, likes: true } },
  likes: { where: { userId: viewerUserId ?? "" }, select: { id: true } },
});

export function listTrips(userId: string) {
  return prisma.trip.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { places: true } } },
  });
}

export async function createTrip(
  userId: string,
  data: {
    name: string;
    startDate: Date;
    endDate: Date;
    personnel: number;
    participants?: { name: string; userId?: string }[];
  }
) {
  const { participants, ...tripData } = data;

  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({ data: { ...tripData, userId } });

    if (participants && participants.length > 0) {
      await tx.tripParticipant.createMany({
        data: participants.map((p) => ({ tripId: trip.id, name: p.name, userId: p.userId })),
      });

      // 가입 회원으로 등록된 동행자는 TripShare도 함께 만들어 바로 열람 권한을 준다
      const registeredIds = [...new Set(participants.map((p) => p.userId))].filter(
        (id): id is string => !!id && id !== userId
      );
      if (registeredIds.length > 0) {
        await tx.tripShare.createMany({
          data: registeredIds.map((id) => ({ tripId: trip.id, userId: id })),
          skipDuplicates: true,
        });
      }
    }

    return trip;
  });
}

// 오너 본인이거나, 오너가 닉네임으로 공유(TripShare)한 회원이면 전체 수정 화면(TripWorkspace)에 들어올 수 있다
export async function getTrip(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, OR: [{ userId }, { shares: { some: { userId } } }] },
    include: {
      user: { select: { nickname: true } },
      places: {
        orderBy: { order: "asc" },
        include: { expenses: true, photos: true },
      },
    },
  });
  if (!trip) return null;

  return { ...trip, places: await attachReviews(trip.places) };
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
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, OR: [{ userId }, { shares: { some: { userId } } }] },
    select: { userId: true },
  });
  if (!trip) return false;

  // 공개 범위(공유) 설정은 오너만 바꿀 수 있다 — 공유받은 회원은 내용은 전부 수정해도 접근 권한 자체는 못 건드린다
  if (data.visibility !== undefined && trip.userId !== userId) {
    throw new ForbiddenError("공개 범위는 여행 소유자만 변경할 수 있습니다.");
  }

  const payload: typeof data & { sharedAt?: Date } = { ...data };
  if (data.visibility && data.visibility !== "PRIVATE") payload.sharedAt = new Date();

  const result = await prisma.trip.updateMany({ where: { id: tripId }, data: payload });
  return result.count > 0;
}

// 대표사진은 공개 범위와 마찬가지로 "이 여행이 남들에게 어떻게 보이는지"를 결정하는 설정이라
// 오너만 바꿀 수 있게 제한한다(공유받아 편집 권한만 있는 회원은 못 건드림 — updateTrip의 visibility와 동일 정책)
export async function setTripCoverPhoto(userId: string, tripId: string, file: File) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId }, select: { coverPhotoKey: true } });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");

  const storageKey = await saveImageFile(file, [tripId, "cover"]);
  if (trip.coverPhotoKey) await deleteStoredFile(trip.coverPhotoKey);

  return prisma.trip.update({ where: { id: tripId }, data: { coverPhotoKey: storageKey } });
}

export async function removeTripCoverPhoto(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId }, select: { coverPhotoKey: true } });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");
  if (!trip.coverPhotoKey) return;

  await deleteStoredFile(trip.coverPhotoKey);
  await prisma.trip.update({ where: { id: tripId }, data: { coverPhotoKey: null } });
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

  const trips = await prisma.trip.findMany({
    where: {
      visibility: "PUBLIC",
      ...(userId ? { userId } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { user: { nickname: { contains: term, mode: "insensitive" } } },
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
      ...likesInclude(viewerUserId),
    },
  });

  return trips.map(withLikeInfo);
}

// 내가 팔로우하는 회원들이 전체공개한 여행 — "게시물" 피드. listSharedTrips와 동일 구조지만
// 대상을 특정 회원이 아니라 "내 팔로잉 전체"로 좁힌다.
export async function listFollowingTrips(cursor: number, viewerUserId: string) {
  const trips = await prisma.trip.findMany({
    where: {
      visibility: "PUBLIC",
      user: { followers: { some: { followerId: viewerUserId } } },
    },
    orderBy: { sharedAt: "desc" },
    skip: cursor,
    take: SHARED_PAGE_SIZE,
    include: {
      user: { select: { nickname: true, avatarUrl: true } },
      ...likesInclude(viewerUserId),
    },
  });

  return trips.map(withLikeInfo);
}

// 링크 전용/특정 회원 지정 공유는 목록에 안 뜨므로, id를 아는 사람이 직접 열람할 때만 이 함수를 거친다
export async function getSharedTrip(tripId: string, viewerUserId: string) {
  const trip = await prisma.trip.findFirst({
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
      _count: { select: { likes: true } },
      likes: { where: { userId: viewerUserId }, select: { id: true } },
    },
  });
  if (!trip) return null;

  const { likes, _count, ...rest } = trip;
  return {
    ...rest,
    places: await attachReviews(rest.places),
    likeCount: _count.likes,
    likedByMe: likes.length > 0,
  };
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

export async function listTripsSharedWithMe(userId: string, cursor: number) {
  const trips = await prisma.trip.findMany({
    where: { shares: { some: { userId } } },
    orderBy: { sharedAt: "desc" },
    skip: cursor,
    take: SHARED_PAGE_SIZE,
    include: {
      user: { select: { nickname: true, avatarUrl: true } },
      ...likesInclude(userId),
    },
  });

  return trips.map(withLikeInfo);
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
