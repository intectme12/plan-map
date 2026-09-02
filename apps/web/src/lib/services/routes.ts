import { prisma } from "../db";
import { NotFoundError } from "../errors";

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const ODSAY_API_KEY = process.env.ODSAY_API_KEY;

const CACHE_TTL_MS = 10 * 60 * 1000;

export type TransportMode = "car" | "bus";

type RouteResult = { distanceM: number; durationSec: number; fareWon: number | null };

type LatLng = { lat: number; lng: number };

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
  const summary = data?.routes?.[0]?.summary;
  if (!summary) return null;

  return {
    distanceM: summary.distance,
    durationSec: summary.duration,
    fareWon: summary.fare?.taxi ?? null,
  };
}

async function fetchBusRoute(from: LatLng, to: LatLng): Promise<RouteResult | null> {
  if (!ODSAY_API_KEY) return null;

  // ODsay 대중교통 경로 API. https://lab.odsay.com/guide/releaseReferenceView
  const url = new URL("https://api.odsay.com/v1/api/searchPubTransPathT");
  url.searchParams.set("apiKey", ODSAY_API_KEY);
  url.searchParams.set("SX", String(from.lng));
  url.searchParams.set("SY", String(from.lat));
  url.searchParams.set("EX", String(to.lng));
  url.searchParams.set("EY", String(to.lat));

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const path = data?.result?.path?.[0]?.info;
  if (!path) return null;

  return {
    distanceM: path.totalDistance,
    durationSec: path.totalTime * 60,
    fareWon: path.payment ?? null,
  };
}

export async function getRoute(
  userId: string,
  tripId: string,
  fromPlaceId: string,
  toPlaceId: string,
  mode: TransportMode
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId }, select: { id: true } });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");

  const [fromPlace, toPlace] = await Promise.all([
    prisma.placeEntry.findFirst({ where: { id: fromPlaceId, tripId } }),
    prisma.placeEntry.findFirst({ where: { id: toPlaceId, tripId } }),
  ]);
  if (!fromPlace || !toPlace) throw new NotFoundError("장소를 찾을 수 없습니다.");

  const cached = await prisma.routeSegment.findUnique({
    where: { fromPlaceId_toPlaceId_mode: { fromPlaceId, toPlaceId, mode } },
  });
  if (cached && Date.now() - cached.computedAt.getTime() < CACHE_TTL_MS) {
    return cached;
  }

  const result =
    mode === "car" ? await fetchCarRoute(fromPlace, toPlace) : await fetchBusRoute(fromPlace, toPlace);

  if (!result) {
    // API 키 미설정이거나 호출 실패 — 있으면 오래된 캐시라도 반환, 없으면 null(교통 API 미설정 상태를 의미)
    return cached ?? null;
  }

  return prisma.routeSegment.upsert({
    where: { fromPlaceId_toPlaceId_mode: { fromPlaceId, toPlaceId, mode } },
    create: { fromPlaceId, toPlaceId, mode, ...result },
    update: { ...result, computedAt: new Date() },
  });
}
