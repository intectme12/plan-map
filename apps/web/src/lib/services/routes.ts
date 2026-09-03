import { prisma } from "../db";
import { NotFoundError } from "../errors";

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const ODSAY_API_KEY = process.env.ODSAY_API_KEY;

const CACHE_TTL_MS = 10 * 60 * 1000;

export type TransportMode = "car" | "bus";

export type TransitLeg = {
  mode: "subway" | "bus" | "walk";
  label: string; // "2호선", "402번", "도보 3분"
  from?: string;
  to?: string;
  stationCount?: number;
};

type RouteResult = {
  distanceM: number;
  durationSec: number;
  fareWon: number | null;
  legs?: TransitLeg[]; // 버스 모드에서만 채워짐(지하철/버스 구간별 상세)
};

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

// ODsay subPath.trafficType: 1=지하철, 2=버스, 3=도보
function parseSubPath(subPath: unknown): TransitLeg[] {
  if (!Array.isArray(subPath)) return [];

  const legs: TransitLeg[] = [];
  for (const step of subPath) {
    if (step.trafficType === 1) {
      legs.push({
        mode: "subway",
        label: step.lane?.[0]?.name ?? "지하철",
        from: step.startName,
        to: step.endName,
        stationCount: step.stationCount,
      });
    } else if (step.trafficType === 2) {
      const busNo = step.lane?.[0]?.busNo;
      legs.push({
        mode: "bus",
        label: busNo ? `${busNo}번` : "버스",
        from: step.startName,
        to: step.endName,
        stationCount: step.stationCount,
      });
    } else if (step.trafficType === 3 && step.sectionTime) {
      legs.push({ mode: "walk", label: `도보 ${step.sectionTime}분` });
    }
  }
  return legs;
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
  const firstPath = data?.result?.path?.[0];
  const info = firstPath?.info;
  if (!info) return null;

  return {
    distanceM: info.totalDistance,
    durationSec: info.totalTime * 60,
    fareWon: info.payment ?? null,
    legs: parseSubPath(firstPath.subPath),
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

  const { legs, ...metrics } = result;
  const detail = legs ?? undefined;

  return prisma.routeSegment.upsert({
    where: { fromPlaceId_toPlaceId_mode: { fromPlaceId, toPlaceId, mode } },
    create: { fromPlaceId, toPlaceId, mode, ...metrics, detail },
    update: { ...metrics, detail, computedAt: new Date() },
  });
}
