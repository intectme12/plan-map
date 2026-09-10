"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";
import { TripMetaEditor } from "./TripMetaEditor";
import { PlaceList, parseDayContainerId } from "./PlaceList";
import { ExpenseSummary } from "./ExpenseSummary";
import { PhotoGallery } from "./PhotoGallery";
import { ReviewGallery } from "./ReviewGallery";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sharedModalOpen, setSharedModalOpen] = useState(false);
  const toast = useToast();

  // 타임라인(순서 변경/삭제)과 지도가 같은 장소 목록을 공유해야 드래그 정렬이 이동경로에 바로 반영된다
  const [items, setItems] = useState(places);
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const reorderTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setItems(places.filter((p) => !pendingDeletes.current.has(p.id)));
  }, [places]);

  const points = useMemo(
    () =>
      items.map((p) => ({
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
      })),
    [items]
  );

  // 여행 시작일~종료일 기준 날짜 목록과, 그 날짜별로 묶은 장소 그룹(지도 이동경로/아코디언이 공유)
  const days = useMemo(
    () => getTripDays(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );
  const groups = useMemo(() => groupByDay(items, days), [items, days]);

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
  const [routePaths, setRoutePaths] = useState<Record<string, { lat: number; lng: number }[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadRoutePaths() {
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

      const next: Record<string, { lat: number; lng: number }[]> = {};
      pairs.forEach(([fromId, toId], i) => {
        const path = results[i]?.path;
        if (Array.isArray(path) && path.length > 1) {
          next[`${fromId}-${toId}`] = path;
        }
      });
      setRoutePaths(next);
    }

    loadRoutePaths();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, pairKey]);

  // 이동경로 선은 펼쳐진 날짜의 것만, 날짜별로 다른 색으로 표시
  const segments = useMemo(() => {
    const result: {
      fromLat: number;
      fromLng: number;
      toLat: number;
      toLng: number;
      path?: { lat: number; lng: number }[];
      color: string;
    }[] = [];
    groups.forEach((group, dayIndex) => {
      if (!expandedDays.has(dayIndex)) return;
      for (let i = 0; i < group.length - 1; i++) {
        const from = group[i];
        const to = group[i + 1];
        result.push({
          fromLat: from.lat,
          fromLng: from.lng,
          toLat: to.lat,
          toLng: to.lng,
          path: routePaths[`${from.id}-${to.id}`],
          color: dayColor(dayIndex),
        });
      }
    });
    return result;
  }, [groups, expandedDays, routePaths]);

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
    <main className="relative h-screen w-full overflow-hidden">
      {/* 지도가 바탕: 화면 전체를 채우고, 타임라인 패널이 그 위 오른쪽에 붙는다 */}
      <div className="absolute inset-0">
        <KakaoMapCanvas points={points} segments={segments} selectedPlaceId={selectedPlaceId} />
      </div>

      <div className="absolute left-4 top-4 z-10 flex gap-2">
        <Link
          href="/trips"
          className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold shadow"
        >
          ← 내 여행계획
        </Link>
        <button
          onClick={() => setSharedModalOpen(true)}
          className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold shadow hover:bg-neutral-50"
        >
          다른 사람 여행계획
        </button>
      </div>

      {sharedModalOpen ? (
        <SharedTripsModal onClose={() => setSharedModalOpen(false)} />
      ) : null}

      <button
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? "패널 숨기기" : "패널 열기"}
        className={`absolute top-1/2 z-20 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-neutral-200 bg-white text-neutral-400 shadow transition-[right] duration-200 hover:bg-neutral-50 hover:text-neutral-600 ${
          sidebarOpen ? "right-[380px]" : "right-0"
        }`}
      >
        {sidebarOpen ? "›" : "‹"}
      </button>

      <aside
        className={`absolute right-0 top-0 z-10 flex h-full w-[380px] flex-col border-l border-neutral-200 bg-white shadow-xl transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="border-b border-neutral-200 p-4">
          <TripMetaEditor trip={trip} isOwner={isOwner} />
        </header>

        <nav className="flex gap-1 border-b border-neutral-200 px-3">
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
          <>
            <Link
              href={`/trips/${trip.id}/import`}
              className="mx-3 mt-3 rounded-md border border-dashed border-blue-300 px-3 py-2 text-center text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              ✨ AI로 일정 가져오기
            </Link>

            <div className="min-h-0 flex-1">
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
          </>
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
    </main>
  );
}
