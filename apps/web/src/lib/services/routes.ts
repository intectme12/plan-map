import { prisma } from "../db";
import { NotFoundError } from "../errors";

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

const CACHE_TTL_MS = 10 * 60 * 1000;

type LatLng = { lat: number; lng: number };

type RouteResult = {
  distanceM: number;
  durationSec: number;
  fareWon: number | null;
  path: LatLng[];
};

async function fetchCarRoute(from: LatLng, to: LatLng): Promise<RouteResult | null> {
  if (!KAKAO_REST_API_KEY) return null;

  const url = new URL("https://apis-navi.kakaomobility.com/v1/directions");
  url.searchParams.set("origin", `${from.lng},${from.lat}`);
  url.searchParams.set("destination", `${to.lng},${to.lat}`);
  url.searchParams.set("priority", "RECOMMEND");

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
  });
  if (!res.ok) return null;

  const data = await res.json();
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
    where: { id: tripId, OR: [{ userId }, { isPublic: true }] },
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
