import { prisma } from "../db";
import { NotFoundError, ForbiddenError, InvalidInputError } from "../errors";
import { TRIP_DATE_ORDER_MESSAGE } from "../validation";
import { saveImageFile, deleteStoredFile } from "../upload";
import { getReviewsForCoordinates, coordKey } from "./reviews";
import { getTripDays, groupByDay } from "@/app/trips/[tripId]/days";

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

export const tripSortOptions = ["latest", "oldest", "name"] as const;
export type TripSortOption = (typeof tripSortOptions)[number];

const TRIP_SORT_ORDER_BY: Record<TripSortOption, { startDate?: "asc" | "desc"; name?: "asc" }> = {
  latest: { startDate: "desc" },
  oldest: { startDate: "asc" },
  name: { name: "asc" },
};

export async function listTrips(userId: string, sort: TripSortOption = "latest") {
  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: TRIP_SORT_ORDER_BY[sort],
    include: { ...likesInclude(userId), _count: { select: { places: true, likes: true } } },
  });
  return trips.map(withLikeInfo);
}

// 홈/트립 목록 사이드바의 "빠른 시작"·"AI 여행계획" 링크가 참조할 대표 트립을 고르는 것과
// 별개로, "여행 통계"(내 여행계획/저장한 장소/방문한 지역) 카드용 집계.
// "저장한 장소"는 별도 찜 기능이 아니라 내가 여행에 담아둔 장소(PlaceEntry) 총합이고,
// "방문한 지역"은 장소 주소의 첫 토큰(시/도 단위)을 지역으로 보고 distinct 개수를 센다.
export async function getTravelStats(userId: string) {
  const [tripCount, places] = await Promise.all([
    prisma.trip.count({ where: { userId } }),
    prisma.placeEntry.findMany({
      where: { trip: { userId } },
      select: { address: true, roadAddress: true },
    }),
  ]);

  const regions = new Set(
    places
      .map((p) => (p.address ?? p.roadAddress ?? "").trim().split(/\s+/)[0])
      .filter(Boolean)
  );

  return { tripCount, savedPlaceCount: places.length, visitedRegionCount: regions.size };
}

// /saved-places 통계 카드 전용 추가 집계(총 이동거리/사용한 금액).
// 이동거리는 트립 상세 타임라인의 날짜별 요약과 같은 기준 — 트립마다 날짜별로 묶은 뒤
// 같은 날 연속한 장소 쌍의 RouteSegment 거리만 더한다(순서 변경 후 남은 옛 캐시는 제외됨).
// 경로는 상세 화면에서 조회될 때 캐시되므로, 아직 한 번도 조회 안 된 구간은 합계에 빠진다.
export async function getTravelTotals(userId: string) {
  const [trips, expenseSum] = await Promise.all([
    prisma.trip.findMany({
      where: { userId },
      select: {
        startDate: true,
        endDate: true,
        places: {
          orderBy: { order: "asc" },
          select: { id: true, scheduledAt: true, routesFrom: { select: { toPlaceId: true, distanceM: true } } },
        },
      },
    }),
    prisma.expense.aggregate({
      where: { placeEntry: { trip: { userId } } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  let totalDistanceM = 0;
  for (const trip of trips) {
    for (const group of groupByDay(trip.places, getTripDays(trip.startDate, trip.endDate))) {
      for (let i = 0; i < group.length - 1; i++) {
        const next = group[i + 1];
        totalDistanceM += group[i].routesFrom.find((r) => r.toPlaceId === next.id)?.distanceM ?? 0;
      }
    }
  }

  // expenseCount: 화면에서 "기록/조회된 게 없어서 0"과 "실제로 0"을 구분해 "—"로 보여주기 위함
  return {
    totalDistanceM,
    totalSpentWon: expenseSum._sum.amount ?? 0,
    expenseCount: expenseSum._count,
  };
}

// 홈 지도 위젯("가장 가까운 여행 하나")과 달리, /trips의 "내 여행 지도"는 내 모든 여행의
// 장소를 한 지도에 함께 보여준다 — 마커 팝업 카테고리 자리에 트립 이름을 넣어 구분한다.
export async function getMapOverviewForUser(userId: string) {
  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, places: { select: { id: true, name: true, lat: true, lng: true } } },
  });

  const points = trips.flatMap((trip) =>
    trip.places.map((place) => ({ ...place, category: trip.name }))
  );

  return { points, tripCount: trips.length, placeCount: points.length };
}

// /saved-places — 내 모든 여행에 담긴 장소를 트립별로 묶어 하나의 목록으로 보여준다.
// 별도 찜(북마크) 테이블이 아니라 기존 PlaceEntry를 재활용(위 getTravelStats의 "저장한 장소"와 동일 집계 기준).
export function listAllPlacesForUser(userId: string) {
  return prisma.placeEntry.findMany({
    where: { trip: { userId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      lat: true,
      lng: true,
      address: true,
      roadAddress: true,
      category: true,
      scheduledAt: true,
      createdAt: true,
      trip: { select: { id: true, name: true } },
      // 목록 썸네일(첫 사진)·사진 수·지출 합계 표시용
      photos: { select: { storageKey: true }, orderBy: { createdAt: "asc" }, take: 1 },
      _count: { select: { photos: true } },
      expenses: { select: { amount: true } },
    },
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
    tags?: string[];
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
    tags: string[];
  }>
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, OR: [{ userId }, { shares: { some: { userId } } }] },
    select: { userId: true, startDate: true, endDate: true },
  });
  if (!trip) return false;

  // 날짜 하나만 바꾸는 요청도 기존 날짜와 합쳐서 종료일<시작일이 되지 않게 막는다
  const nextStart = data.startDate ?? trip.startDate;
  const nextEnd = data.endDate ?? trip.endDate;
  if (nextEnd < nextStart) throw new InvalidInputError(TRIP_DATE_ORDER_MESSAGE);

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
  viewerUserId?: string,
  tag?: string
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
      ...(tag ? { tags: { has: tag } } : {}),
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

// 홈 화면 "추천 여행지" 그리드용 — listSharedTrips(다른 사람 여행계획 탭)와 달리 최신순이 아니라
// 좋아요 많은 순으로 정렬해서 "지금 가장 인기 있는 여행지"를 보여준다. 기존 탭 정렬은 건드리지 않기 위해 별도 함수로 둔다.
export async function listPopularSharedTrips(tag: string | undefined, viewerUserId: string | undefined, limit = 8) {
  const trips = await prisma.trip.findMany({
    where: {
      visibility: "PUBLIC",
      ...(tag ? { tags: { has: tag } } : {}),
    },
    orderBy: [{ likes: { _count: "desc" } }, { sharedAt: "desc" }],
    take: limit,
    include: {
      user: { select: { nickname: true, avatarUrl: true } },
      ...likesInclude(viewerUserId),
    },
  });

  return trips.map(withLikeInfo);
}

// 홈 화면 "내 여행계획" 지도 위젯용 — 가장 가까운 예정 여행이 있으면 그것을, 없으면 가장 최근 여행을 보여준다.
export function getFeaturedTripForHome(userId: string) {
  const now = new Date();
  return prisma.trip
    .findFirst({
      where: { userId, endDate: { gte: now } },
      orderBy: { startDate: "asc" },
      include: {
        places: { select: { id: true, name: true, lat: true, lng: true } },
        _count: { select: { places: true } },
      },
    })
    .then(
      (upcoming) =>
        upcoming ??
        prisma.trip.findFirst({
          where: { userId },
          orderBy: { startDate: "desc" },
          include: {
            places: { select: { id: true, name: true, lat: true, lng: true } },
            _count: { select: { places: true } },
          },
        })
    );
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

// 공유 팝업의 "함께할 사람" 목록 보조 정보 — 소유자(맨 위 고정 행)와, 여행 생성 때 이름만 등록한
// 미가입 동행자(TripParticipant.userId 없음, 계정이 없어 공유 권한은 없음). 가입 회원 동행자는
// 생성 시 TripShare도 같이 만들어지므로 listTripShares 쪽에 이미 나온다.
export async function getTripShareContext(ownerId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: ownerId },
    select: {
      user: { select: { id: true, nickname: true, avatarUrl: true } },
      participants: { where: { userId: null }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } },
    },
  });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");
  return { owner: trip.user, guests: trip.participants };
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
