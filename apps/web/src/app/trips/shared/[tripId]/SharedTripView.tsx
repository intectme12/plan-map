"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";
import { LikeButton } from "@/components/LikeButton";
import { TripHeroBanner } from "@/app/trips/[tripId]/TripHeroBanner";
import { AIAssistantCard } from "@/app/trips/[tripId]/AIAssistantCard";
import { ExpenseSummary } from "@/app/trips/[tripId]/ExpenseSummary";
import { getTripDays, groupByDay, dayColor } from "@/app/trips/[tripId]/days";
import type { PlaceEntry } from "@/app/trips/[tripId]/types";
import { SharedPlaceList } from "./SharedPlaceList";
import { SharedPhotoGrid } from "./SharedPhotoGrid";
import { SharedReviewGallery } from "./SharedReviewGallery";
import { CopyTripButton } from "./CopyTripButton";
import { PlaceReviewsModal } from "@/app/trips/[tripId]/PlaceReviewsModal";

const TABS = [
  { key: "timeline", label: "타임라인" },
  { key: "expense", label: "비용" },
  { key: "photos", label: "사진" },
  { key: "reviews", label: "후기" },
] as const;

type TripMeta = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  personnel: number;
  visibility: string;
  coverPhotoKey?: string | null;
  ownerNickname: string;
  likeCount: number;
  likedByMe: boolean;
};

export function SharedTripView({
  trip,
  places,
  activeTab,
  isOwnTrip,
}: {
  trip: TripMeta;
  places: PlaceEntry[];
  activeTab: (typeof TABS)[number]["key"];
  isOwnTrip: boolean;
}) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [reviewsModalPlaceId, setReviewsModalPlaceId] = useState<string | null>(null);

  function handleSelectSegment(id: string) {
    setSelectedSegmentId((prev) => (prev === id ? null : id));
  }

  const days = useMemo(
    () => getTripDays(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );
  const groups = useMemo(() => groupByDay(places, days), [places, days]);

  const points = useMemo(
    () =>
      groups.flatMap((group, dayIndex) =>
        group.map((p, i) => ({
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          category: p.category,
          address: p.address,
          roadAddress: p.roadAddress,
          phone: p.phone,
          placeUrl: p.placeUrl,
          rating: p.avgRating ?? undefined,
          reviewCount: p.reviewCount,
          label: i + 1,
          markerColor: dayColor(dayIndex),
          photoUrl: p.photos[0]?.storageKey ?? null,
          costWon: p.expenses.reduce((sum, e) => sum + e.amount, 0) || undefined,
        }))
      ),
    [groups]
  );

  // 타임라인 탭에서 지금 보고 있는 날짜 하나 — 지도 이동경로 표시도 이 날짜 기준으로 맞춘다
  // (owner용 TripWorkspace.tsx와 동일한 패턴. 사진/후기 탭은 각자 자기만의 날짜 선택 상태를
  // 따로 가짐 — SharedPhotoGrid/SharedReviewGallery 내부 참고)
  const [selectedDay, setSelectedDay] = useState(() => {
    const firstWithPlaces = groups.findIndex((g) => g.length > 0);
    return firstWithPlaces >= 0 ? firstWithPlaces : 0;
  });
  const safeSelectedDay = Math.min(selectedDay, days.length - 1);

  // 지도 범위(fitBounds)를 지금 선택된 날짜의 장소로만 좁힌다(owner용 TripWorkspace.tsx와 동일 패턴)
  const focusPlaceIds = useMemo(
    () => (groups[safeSelectedDay] ?? []).map((p) => p.id),
    [groups, safeSelectedDay]
  );

  const pairKey = groups
    .flatMap((group, dayIndex) => group.slice(0, -1).map((p, i) => `${dayIndex}:${p.id}-${group[i + 1].id}`))
    .join(",");
  type RouteDetail = { path?: { lat: number; lng: number }[]; durationSec?: number; distanceM?: number };
  const [routeDetails, setRouteDetails] = useState<Record<string, RouteDetail>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadRouteDetails() {
      const pairs: (readonly [string, string])[] = [];
      groups.forEach((group) => {
        for (let i = 0; i < group.length - 1; i++) {
          pairs.push([group[i].id, group[i + 1].id] as const);
        }
      });

      const results = await Promise.all(
        pairs.map(([fromId, toId]) =>
          fetch(`/api/trips/${trip.id}/routes?from=${fromId}&to=${toId}`)
            .then((res) => res.json())
            .catch(() => null)
        )
      );
      if (cancelled) return;

      const next: Record<string, RouteDetail> = {};
      pairs.forEach(([fromId, toId], i) => {
        const result = results[i];
        const path = result?.path;
        next[`${fromId}-${toId}`] = {
          path: Array.isArray(path) && path.length > 1 ? path : undefined,
          durationSec: typeof result?.durationSec === "number" ? result.durationSec : undefined,
          distanceM: typeof result?.distanceM === "number" ? result.distanceM : undefined,
        };
      });
      setRouteDetails(next);
    }

    loadRouteDetails();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, pairKey]);

  // 이동경로 선은 타임라인에서 지금 보고 있는 날짜의 것만 표시(owner용과 동일)
  const segments = useMemo(() => {
    const result: {
      id: string;
      fromLat: number;
      fromLng: number;
      toLat: number;
      toLng: number;
      path?: { lat: number; lng: number }[];
      color: string;
      durationSec?: number;
      distanceM?: number;
    }[] = [];
    const group = groups[safeSelectedDay];
    if (group) {
      for (let i = 0; i < group.length - 1; i++) {
        const from = group[i];
        const to = group[i + 1];
        const detail = routeDetails[`${from.id}-${to.id}`];
        result.push({
          id: `${from.id}-${to.id}`,
          fromLat: from.lat,
          fromLng: from.lng,
          toLat: to.lat,
          toLng: to.lng,
          path: detail?.path,
          color: dayColor(safeSelectedDay),
          durationSec: detail?.durationSec,
          distanceM: detail?.distanceM,
        });
      }
    }
    return result;
  }, [groups, safeSelectedDay, routeDetails]);

  // 타임라인 탭의 날짜별 요약(이동시간/거리/비용) — owner용 TripWorkspace.tsx와 동일하게
  // 모든 날짜를 미리 계산해두고 SharedPlaceList가 선택된 날짜 값만 꺼내 쓴다.
  const dayStats = useMemo(
    () =>
      groups.map((group) => {
        let durationSec = 0;
        let distanceM = 0;
        for (let i = 0; i < group.length - 1; i++) {
          const detail = routeDetails[`${group[i].id}-${group[i + 1].id}`];
          durationSec += detail?.durationSec ?? 0;
          distanceM += detail?.distanceM ?? 0;
        }
        const cost = group.reduce((sum, p) => sum + p.expenses.reduce((s, e) => s + e.amount, 0), 0);
        return { placeCount: group.length, durationSec, distanceM, cost };
      }),
    [groups, routeDetails]
  );

  const { expenseTotal, byCategory, placeTotals } = useMemo(() => {
    const totals = places.map((place) => ({
      id: place.id,
      name: place.name,
      total: place.expenses.reduce((sum, e) => sum + e.amount, 0),
      expenses: place.expenses,
    }));

    const categoryMap = new Map<string, number>();
    for (const place of places) {
      for (const e of place.expenses) {
        categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + e.amount);
      }
    }

    return {
      expenseTotal: totals.reduce((sum, p) => sum + p.total, 0),
      byCategory: Array.from(categoryMap.entries()).map(([category, amount]) => ({
        category,
        amount,
      })),
      placeTotals: totals,
    };
  }, [places]);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      {reviewsModalPlaceId
        ? (() => {
            const place = places.find((p) => p.id === reviewsModalPlaceId);
            if (!place) return null;
            return (
              <PlaceReviewsModal
                placeName={place.name}
                reviews={place.reviews}
                onClose={() => setReviewsModalPlaceId(null)}
              />
            );
          })()
        : null}

      {/* 내 여행 상세(TripWorkspace.tsx)와 같은 레이아웃 — 카카오맵을 페이지 전체 배경으로 깔고,
          히어로(대표사진+제목)를 맨 위에 포함한 오른쪽 패널을 그 위에 오버레이로 띄운다 */}
      <div className="absolute inset-0">
        <KakaoMapCanvas
          points={points}
          segments={segments}
          selectedPlaceId={selectedPlaceId}
          selectedSegmentId={selectedSegmentId}
          onOpenReviews={setReviewsModalPlaceId}
          onSelectSegment={handleSelectSegment}
          focusPlaceIds={focusPlaceIds}
        />
      </div>

      {/* AI 여행 도우미는 내 여행일 때만(남의 여행엔 장소를 추가할 수 없음) — 지도 왼쪽 위 독립 카드 */}
      {isOwnTrip ? (
        <div className="absolute left-4 right-4 top-4 z-20 sm:right-auto sm:w-[360px]">
          <AIAssistantCard href={`/trips/${trip.id}/import`} />
        </div>
      ) : null}

      {/* 모바일에서는 하단 시트, sm 이상에서는 오른쪽 위~아래 전체 높이 (TripWorkspace와 동일) */}
      <aside className="absolute inset-x-4 bottom-4 z-20 flex h-[55vh] flex-col overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-xl sm:inset-x-auto sm:right-4 sm:top-4 sm:h-auto sm:w-[380px] lg:w-[420px]">
        <TripHeroBanner coverPhotoKey={trip.coverPhotoKey ?? null} squareBottom compact>
          <div className="absolute right-3 top-3 z-10">
            <LikeButton
              tripId={trip.id}
              initialLiked={trip.likedByMe}
              initialCount={trip.likeCount}
              className="flex h-8 flex-none items-center gap-1 rounded-full border border-white/30 bg-white/15 px-3 text-xs text-white backdrop-blur"
            />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-lg font-bold text-white drop-shadow-sm sm:text-xl">{trip.name}</h1>
              <p className="text-xs text-white/85 drop-shadow-sm sm:text-sm">
                {new Date(trip.startDate).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}{" "}
                – {new Date(trip.endDate).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })} ·{" "}
                {trip.personnel}명 · {trip.ownerNickname}님의 여행
              </p>
            </div>
            {isOwnTrip ? (
              <span className="inline-block self-start rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs text-white backdrop-blur">
                내가 만든 여행입니다
              </span>
            ) : trip.visibility !== "PRIVATE" ? (
              <div className="self-start">
                <CopyTripButton tripId={trip.id} />
              </div>
            ) : null}
          </div>
        </TripHeroBanner>

        <nav className="flex gap-1 border-b border-neutral-100 px-3 pt-2">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "timeline" ? `/trips/shared/${trip.id}` : `/trips/shared/${trip.id}?tab=${t.key}`}
              className={`border-b-2 px-3 py-2 text-sm font-semibold ${
                activeTab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {activeTab === "timeline" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SharedPlaceList
              tripId={trip.id}
              trip={{ startDate: trip.startDate, endDate: trip.endDate }}
              places={places}
              dayStats={dayStats}
              selectedDay={safeSelectedDay}
              onSelectDay={setSelectedDay}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={setSelectedPlaceId}
            />
          </div>
        ) : activeTab === "expense" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ExpenseSummary
              total={expenseTotal}
              byCategory={byCategory}
              places={placeTotals}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={setSelectedPlaceId}
            />
          </div>
        ) : activeTab === "photos" ? (
          <div className="min-h-0 flex-1">
            <SharedPhotoGrid
              trip={{ startDate: trip.startDate, endDate: trip.endDate }}
              places={places}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={setSelectedPlaceId}
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <SharedReviewGallery
              trip={{ startDate: trip.startDate, endDate: trip.endDate }}
              places={places}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={setSelectedPlaceId}
            />
          </div>
        )}
      </aside>
    </div>
  );
}
