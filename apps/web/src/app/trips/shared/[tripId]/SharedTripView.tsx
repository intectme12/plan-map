"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";
import { LikeButton } from "@/components/LikeButton";
import { TripHeroBanner } from "@/app/trips/[tripId]/TripHeroBanner";
import { AIAssistantCard } from "@/app/trips/[tripId]/AIAssistantCard";
import { TripSummaryCard } from "@/app/trips/[tripId]/TripSummaryCard";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    () => new Set(days.map((_, i) => i).filter((i) => i === 0 || groups[i].length > 0))
  );

  function toggleDay(dayIndex: number) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      return next;
    });
  }

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
    groups.forEach((group, dayIndex) => {
      if (!expandedDays.has(dayIndex)) return;
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
          color: dayColor(dayIndex),
          durationSec: detail?.durationSec,
          distanceM: detail?.distanceM,
        });
      }
    });
    return result;
  }, [groups, expandedDays, routeDetails]);

  const routeSummary = useMemo(
    () =>
      segments.reduce(
        (acc, s) => ({
          durationSec: acc.durationSec + (s.durationSec ?? 0),
          distanceM: acc.distanceM + (s.distanceM ?? 0),
        }),
        { durationSec: 0, distanceM: 0 }
      ),
    [segments]
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
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <Link
        href="/trips?tab=shared"
        className="mb-4 inline-block rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm ring-1 ring-neutral-200"
      >
        ← 다른 사람 여행계획
      </Link>

      {/* 히어로(지도와 같은 폭)와 AI 카드(패널과 같은 폭)를 아래 지도/패널 행과 같은 비율로 나란히 배치 */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="lg:flex-1">
          <TripHeroBanner coverPhotoKey={trip.coverPhotoKey ?? null}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-lg font-bold text-neutral-900">{trip.name}</h1>
                <p className="text-sm text-neutral-500">
                  {new Date(trip.startDate).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}{" "}
                  – {new Date(trip.endDate).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })} ·{" "}
                  {trip.personnel}명 · {trip.ownerNickname}
                </p>
              </div>
              <LikeButton tripId={trip.id} initialLiked={trip.likedByMe} initialCount={trip.likeCount} />
            </div>
            {isOwnTrip ? (
              <span className="mt-2 inline-block rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-500">
                내가 만든 여행입니다
              </span>
            ) : trip.visibility !== "PRIVATE" ? (
              <div className="mt-2">
                <CopyTripButton tripId={trip.id} />
              </div>
            ) : null}
          </TripHeroBanner>
        </div>
        {isOwnTrip ? (
          <div className="lg:w-[420px] lg:flex-none">
            <AIAssistantCard href={`/trips/${trip.id}/import`} />
          </div>
        ) : null}
      </div>

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

      <div className="relative mt-6 flex flex-col gap-4 lg:h-[680px] lg:flex-row">
        <div className="relative h-[420px] overflow-hidden rounded-3xl border border-neutral-100 shadow-sm lg:h-full lg:flex-1">
          <KakaoMapCanvas
            points={points}
            segments={segments}
            selectedPlaceId={selectedPlaceId}
            selectedSegmentId={selectedSegmentId}
            onOpenReviews={setReviewsModalPlaceId}
            onSelectSegment={handleSelectSegment}
          />
        </div>

        <button
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? "패널 숨기기" : "패널 열기"}
          className="hidden h-12 w-6 flex-none items-center justify-center self-center rounded-md border border-neutral-200 bg-white text-neutral-400 shadow hover:bg-neutral-50 hover:text-neutral-600 lg:flex"
        >
          {sidebarOpen ? "›" : "‹"}
        </button>

        {sidebarOpen ? (
          <aside className="flex h-[560px] flex-col overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm lg:h-full lg:w-[420px] lg:flex-none">
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
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <SharedPlaceList
                    tripId={trip.id}
                    trip={{ startDate: trip.startDate, endDate: trip.endDate }}
                    places={places}
                    selectedPlaceId={selectedPlaceId}
                    onSelectPlace={setSelectedPlaceId}
                    expandedDays={expandedDays}
                    onToggleDay={toggleDay}
                  />
                </div>
                <TripSummaryCard
                  placeCount={places.length}
                  totalDurationSec={routeSummary.durationSec}
                  totalDistanceM={routeSummary.distanceM}
                  totalExpense={expenseTotal}
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
                  expandedDays={expandedDays}
                  onToggleDay={toggleDay}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1">
                <SharedReviewGallery
                  trip={{ startDate: trip.startDate, endDate: trip.endDate }}
                  places={places}
                  selectedPlaceId={selectedPlaceId}
                  onSelectPlace={setSelectedPlaceId}
                  expandedDays={expandedDays}
                  onToggleDay={toggleDay}
                />
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
