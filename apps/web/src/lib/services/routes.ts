import { prisma } from "../db";
import { NotFoundError } from "../errors";
import { enforceRateLimits, RATE_RULES } from "../rateLimit";
import { kakaoGet } from "./kakaoClient";

const CACHE_TTL_MS = 10 * 60 * 1000;

type LatLng = { lat: number; lng: number };

type RouteResult = {
  distanceM: number;
  durationSec: number;
  fareWon: number | null;
  path: LatLng[];
};

// 카카오모빌리티 길찾기 응답 중 쓰는 부분만
type DirectionsResponse = {
  routes?: {
    summary?: { distance: number; duration: number; fare?: { taxi?: number } };
    sections?: { roads?: { vertexes?: number[] }[] }[];
  }[];
};

// 키 미설정·호출 실패·회로 차단·일일 예산 소진이면 null(호출 측은 있던 값으로 대신 표시)
async function fetchCarRoute(from: LatLng, to: LatLng): Promise<RouteResult | null> {
  const url = new URL("https://apis-navi.kakaomobility.com/v1/directions");
  url.searchParams.set("origin", `${from.lng},${from.lat}`);
  url.searchParams.set("destination", `${to.lng},${to.lat}`);
  url.searchParams.set("priority", "RECOMMEND");

  const result = await kakaoGet("directions", url);
  if (!result.ok) return null;

  const data = result.data as DirectionsResponse | null;
  const route = data?.routes?.[0];
  const summary = route?.summary;
  if (!summary) return null;

  // 실제 도로를 따라가는 좌표 — sections[].roads[].vertexes는 [lng, lat, lng, lat, ...] 형태의 평면 배열
  const path: LatLng[] = [];
  for (const section of route.sections ?? []) {
    for (const road of section.roads ?? []) {
      const vertexes: number[] = road.vertexes ?? [];
      for (let i = 0; i + 1 < vertexes.length; i += 2) {
        path.push({ lng: vertexes[i], lat: vertexes[i + 1] });
      }
    }
  }

  return {
    distanceM: summary.distance,
    durationSec: summary.duration,
    fareWon: summary.fare?.taxi ?? null,
    path,
  };
}

export async function getRoute(
  userId: string,
  tripId: string,
  fromPlaceId: string,
  toPlaceId: string
) {
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      OR: [
        { userId },
        { visibility: { in: ["PUBLIC", "UNLISTED"] } },
        { shares: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");

  const [fromPlace, toPlace] = await Promise.all([
    prisma.placeEntry.findFirst({ where: { id: fromPlaceId, tripId } }),
    prisma.placeEntry.findFirst({ where: { id: toPlaceId, tripId } }),
  ]);
  if (!fromPlace || !toPlace) throw new NotFoundError("장소를 찾을 수 없습니다.");

  const cached = await prisma.routeSegment.findUnique({
    where: { fromPlaceId_toPlaceId: { fromPlaceId, toPlaceId } },
  });
  if (cached && Date.now() - cached.computedAt.getTime() < CACHE_TTL_MS) {
    return cached;
  }

  // 카카오를 실제로 불러야 할 때만 사용자별 요청 수를 센다. 넘으면 오류 대신 있던 값(없으면 null)을 준다 —
  // 여행 상세는 구간 수만큼 한꺼번에 요청하므로, 한 구간 때문에 화면 전체가 오류가 나지 않게.
  const limited = await enforceRateLimits([{ rule: RATE_RULES.routePerUserMin, subject: userId }]);
  if (!limited.ok) return cached ?? null;

  const result = await fetchCarRoute(fromPlace, toPlace);

  if (!result) {
    // API 키 미설정이거나 호출 실패 — 있으면 오래된 캐시라도 반환, 없으면 null(교통 API 미설정 상태를 의미)
    return cached ?? null;
  }

  const { path, ...metrics } = result;

  return prisma.routeSegment.upsert({
    where: { fromPlaceId_toPlaceId: { fromPlaceId, toPlaceId } },
    create: { fromPlaceId, toPlaceId, ...metrics, path },
    update: { ...metrics, path, computedAt: new Date() },
  });
}
