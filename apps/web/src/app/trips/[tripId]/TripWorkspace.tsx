"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";
import { TripMetaEditor } from "./TripMetaEditor";
import { TripHeroBanner } from "./TripHeroBanner";
import { AIAssistantCard } from "./AIAssistantCard";
import { TripSummaryCard } from "./TripSummaryCard";
import { PlaceList, parseDayContainerId } from "./PlaceList";
import { ExpenseSummary } from "./ExpenseSummary";
import { PhotoGallery } from "./PhotoGallery";
import { ReviewGallery } from "./ReviewGallery";
import { PlaceReviewsModal } from "./PlaceReviewsModal";
import { getTripDays, groupByDay, dayColor, dayIndexForPlace } from "./days";
import { useToast } from "@/components/toast/ToastProvider";
import { SharedTripsModal } from "./SharedTripsModal";
import type { PlaceEntry } from "./types";

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
  coverPhotoKey: string | null;
  ownerNickname: string;
};

export function TripWorkspace({
  trip,
  places,
  activeTab,
  isOwner,
  currentUserId,
}: {
  trip: TripMeta;
  places: PlaceEntry[];
  activeTab: (typeof TABS)[number]["key"];
  isOwner: boolean;
  currentUserId: string;
}) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sharedModalOpen, setSharedModalOpen] = useState(false);
  const [reviewsModalPlaceId, setReviewsModalPlaceId] = useState<string | null>(null);
  const toast = useToast();

  // 경로 라벨을 다시 클릭하면 선택 해제(같은 구간이면 토글)
  function handleSelectSegment(id: string) {
    setSelectedSegmentId((prev) => (prev === id ? null : id));
  }

  // 타임라인(순서 변경/삭제)과 지도가 같은 장소 목록을 공유해야 드래그 정렬이 이동경로에 바로 반영된다
  const [items, setItems] = useState(places);
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const reorderTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setItems(places.filter((p) => !pendingDeletes.current.has(p.id)));
  }, [places]);

  // 여행 시작일~종료일 기준 날짜 목록과, 그 날짜별로 묶은 장소 그룹(지도 이동경로/아코디언이 공유)
  const days = useMemo(
    () => getTripDays(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );
  const groups = useMemo(() => groupByDay(items, days), [items, days]);

  // 지도 마커 번호·색을 타임라인 카드와 똑같이(그 날짜 안에서 몇 번째인지) 맞추기 위해
  // 평평한 items가 아니라 day별로 묶은 groups에서 points를 만든다.
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

  // 같은 날짜 안에서 연속된 장소 쌍만 뽑아서, 순서가 안 바뀌면 재조회하지 않도록 함
  const pairKey = groups
    .flatMap((group, dayIndex) => group.slice(0, -1).map((p, i) => `${dayIndex}:${p.id}-${group[i + 1].id}`))
    .join(",");
  // path 외에 durationSec/distanceM도 같이 들고 있는다 — 지도 위 경로 라벨과 "여행 요약"
  // 카드가 같은 값을 쓴다(사이드바의 RouteSegmentRow는 그 카드 안에서 독립적으로 표시만
  // 하던 그대로 유지 — 여기서는 지도/요약용으로 별도 보관).
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

  // 이동경로 선은 펼쳐진 날짜의 것만, 날짜별로 다른 색으로 표시
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
    const totals = items.map((place) => ({
      id: place.id,
      name: place.name,
      total: place.expenses.reduce((sum, e) => sum + e.amount, 0),
      expenses: place.expenses,
    }));

    const categoryMap = new Map<string, number>();
    for (const place of items) {
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
  }, [items]);

  function handleDeletePlace(place: PlaceEntry) {
    setItems((prev) => prev.filter((p) => p.id !== place.id));

    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(place.id);
      await fetch(`/api/trips/${trip.id}/places/${place.id}`, { method: "DELETE" });
    }, 5000);
    pendingDeletes.current.set(place.id, timer);

    toast.show(`${place.name} 삭제됨`, {
      actionLabel: "실행취소",
      onAction: () => {
        clearTimeout(timer);
        pendingDeletes.current.delete(place.id);
        setItems((prev) => {
          if (prev.some((p) => p.id === place.id)) return prev;
          const restored = [...prev, place];
          restored.sort((a, b) => a.order - b.order);
          return restored;
        });
      },
    });
  }

  function patchPlace(placeId: string, body: { order?: number; scheduledAt?: string }) {
    fetch(`/api/trips/${trip.id}/places/${placeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  // 목적지 날짜 하나당 500ms 디바운스 후 그 날짜에 속한 장소들의 order(+ 이동된 장소의 scheduledAt)를 저장
  function schedulePatch(dayIndex: number, run: () => void) {
    if (reorderTimers.current.has(dayIndex)) clearTimeout(reorderTimers.current.get(dayIndex));
    const timer = setTimeout(run, 500);
    reorderTimers.current.set(dayIndex, timer);
  }

  // 장소 드래그: 같은 날짜 안에서는 순서만, 다른 날짜 위/컨테이너로 놓으면 scheduledAt까지 옮긴다
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    setItems((prev) => {
      const activePlace = prev.find((p) => p.id === active.id);
      if (!activePlace) return prev;
      const sourceDayIndex = dayIndexForPlace(activePlace, days);

      const overDayFromContainer = parseDayContainerId(over.id);
      const overPlace = overDayFromContainer === null ? prev.find((p) => p.id === over.id) : undefined;
      if (overDayFromContainer === null && !overPlace) return prev;
      const destDayIndex = overDayFromContainer ?? dayIndexForPlace(overPlace!, days);

      if (sourceDayIndex === destDayIndex) {
        if (active.id === over.id) return prev;

        const group = groupByDay(prev, days)[sourceDayIndex];
        const oldIndex = group.findIndex((p) => p.id === active.id);
        const newIndex =
          overDayFromContainer !== null ? group.length - 1 : group.findIndex((p) => p.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return prev;

        const reorderedGroup = arrayMove(group, oldIndex, newIndex);
        const orderSlots = group.map((p) => p.order).sort((a, b) => a - b);
        const orderById = new Map(reorderedGroup.map((p, i) => [p.id, orderSlots[i]]));

        const next = prev.map((p) => (orderById.has(p.id) ? { ...p, order: orderById.get(p.id)! } : p));
        next.sort((a, b) => a.order - b.order);

        schedulePatch(sourceDayIndex, () => {
          reorderedGroup.forEach((p) => patchPlace(p.id, { order: orderById.get(p.id)! }));
        });

        return next;
      }

      // 다른 날짜로 이동: 목적지 그룹에 삽입하고, 그 날짜의 order 값 집합에 새 값 하나를 더해 재배치
      const destGroup = groupByDay(prev, days)[destDayIndex];
      const withoutActive = destGroup.filter((p) => p.id !== active.id);
      const insertAt =
        overDayFromContainer !== null
          ? withoutActive.length
          : Math.max(0, withoutActive.findIndex((p) => p.id === over.id));
      const newDestGroup = [
        ...withoutActive.slice(0, insertAt),
        activePlace,
        ...withoutActive.slice(insertAt),
      ];

      const maxOrder = Math.max(0, ...prev.map((p) => p.order));
      const orderSlots = [...withoutActive.map((p) => p.order), maxOrder + 1].sort((a, b) => a - b);
      const orderById = new Map(newDestGroup.map((p, i) => [p.id, orderSlots[i]]));
      const destDate = days[destDayIndex];

      const next = prev.map((p) => {
        if (p.id === active.id) return { ...p, order: orderById.get(p.id)!, scheduledAt: destDate };
        if (orderById.has(p.id)) return { ...p, order: orderById.get(p.id)! };
        return p;
      });
      next.sort((a, b) => a.order - b.order);

      setExpandedDays((prevExpanded) => {
        if (prevExpanded.has(destDayIndex)) return prevExpanded;
        const nextExpanded = new Set(prevExpanded);
        nextExpanded.add(destDayIndex);
        return nextExpanded;
      });

      schedulePatch(destDayIndex, () => {
        newDestGroup.forEach((p) => {
          const body: { order: number; scheduledAt?: string } = { order: orderById.get(p.id)! };
          if (p.id === active.id) body.scheduledAt = destDate.toISOString();
          patchPlace(p.id, body);
        });
      });

      return next;
    });
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/trips"
          className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm ring-1 ring-neutral-200"
        >
          ← 내 여행계획
        </Link>
        <button
          onClick={() => setSharedModalOpen(true)}
          className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm ring-1 ring-neutral-200 hover:bg-neutral-50"
        >
          다른 사람 여행계획
        </button>
      </div>

      {/* 히어로(지도와 같은 폭)와 AI 카드(패널과 같은 폭)를 아래 지도/패널 행과 같은 비율로 나란히 배치 */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="lg:flex-1">
          <TripHeroBanner coverPhotoKey={trip.coverPhotoKey}>
            <TripMetaEditor trip={trip} isOwner={isOwner} />
          </TripHeroBanner>
        </div>
        <div className="lg:w-[420px] lg:flex-none">
          <AIAssistantCard href={`/trips/${trip.id}/import`} />
        </div>
      </div>

      {sharedModalOpen ? (
        <SharedTripsModal onClose={() => setSharedModalOpen(false)} />
      ) : null}

      {reviewsModalPlaceId
        ? (() => {
            const place = items.find((p) => p.id === reviewsModalPlaceId);
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

      {/* 지도 72% : 타임라인 패널 28% — 데스크톱은 좌우로, 모바일은 지도가 위/패널이 아래로 쌓인다 */}
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
                  href={t.key === "timeline" ? `/trips/${trip.id}` : `/trips/${trip.id}?tab=${t.key}`}
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
                  <PlaceList
                    tripId={trip.id}
                    trip={{ startDate: trip.startDate, endDate: trip.endDate }}
                    places={items}
                    selectedPlaceId={selectedPlaceId}
                    onSelectPlace={setSelectedPlaceId}
                    expandedDays={expandedDays}
                    onToggleDay={toggleDay}
                    onDeletePlace={handleDeletePlace}
                    onDragEnd={handleDragEnd}
                  />
                </div>
                <TripSummaryCard
                  placeCount={items.length}
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
                <PhotoGallery
                  tripId={trip.id}
                  trip={{ startDate: trip.startDate, endDate: trip.endDate }}
                  places={items}
                  selectedPlaceId={selectedPlaceId}
                  onSelectPlace={setSelectedPlaceId}
                  expandedDays={expandedDays}
                  onToggleDay={toggleDay}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1">
                <ReviewGallery
                  tripId={trip.id}
                  trip={{ startDate: trip.startDate, endDate: trip.endDate }}
                  places={items}
                  currentUserId={currentUserId}
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
