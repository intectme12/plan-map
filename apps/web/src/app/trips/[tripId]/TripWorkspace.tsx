"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";
import { TripMetaEditor } from "./TripMetaEditor";
import { TripHeroBanner } from "./TripHeroBanner";
import { AIAssistantCard } from "./AIAssistantCard";
import { PlaceList } from "./PlaceList";
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

  // 타임라인 탭에서 지금 보고 있는 날짜 하나 — 지도 이동경로 표시도 이 날짜 기준으로 맞춘다
  // (예전엔 여러 날짜를 동시에 펼 수 있는 Set이었지만, 타임라인이 날짜 탭 방식으로 바뀌면서
  // 화면에 실제로 보이는 날짜도 항상 하나뿐이라 단순한 숫자 하나로 충분해짐)
  const [selectedDay, setSelectedDay] = useState(() => {
    const firstWithPlaces = groups.findIndex((g) => g.length > 0);
    return firstWithPlaces >= 0 ? firstWithPlaces : 0;
  });
  const safeSelectedDay = Math.min(selectedDay, days.length - 1);

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

  // 이동경로 선은 타임라인에서 지금 보고 있는 날짜의 것만 표시
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

  // 타임라인 탭의 날짜별 요약(이동시간/거리/비용) — 모든 날짜를 미리 계산해두고, 그 중
  // 지금 선택된 날짜(safeSelectedDay) 값만 PlaceList가 꺼내 쓴다(다른 날짜로 넘어가는 구간은 제외).
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

  // 장소 드래그: 타임라인이 선택된 날짜 하나만 보여주므로 같은 날짜 안 순서 변경만 처리한다
  // (다른 날짜로 옮기는 건 더 이상 드래그가 아니라 moveToDay 버튼/드롭다운으로 한다)
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const activePlace = prev.find((p) => p.id === active.id);
      if (!activePlace) return prev;
      const dayIndex = dayIndexForPlace(activePlace, days);

      const group = groupByDay(prev, days)[dayIndex];
      const oldIndex = group.findIndex((p) => p.id === active.id);
      const newIndex = group.findIndex((p) => p.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;

      const reorderedGroup = arrayMove(group, oldIndex, newIndex);
      const orderSlots = group.map((p) => p.order).sort((a, b) => a - b);
      const orderById = new Map(reorderedGroup.map((p, i) => [p.id, orderSlots[i]]));

      const next = prev.map((p) => (orderById.has(p.id) ? { ...p, order: orderById.get(p.id)! } : p));
      next.sort((a, b) => a.order - b.order);

      schedulePatch(dayIndex, () => {
        reorderedGroup.forEach((p) => patchPlace(p.id, { order: orderById.get(p.id)! }));
      });

      return next;
    });
  }

  // 장소를 다른 날짜로 이동 — 목적지 날짜의 맨 끝에 넣고 order/scheduledAt을 다시 계산한다
  // (예전에 드래그로 다른 날짜 컨테이너에 놓았을 때와 같은 계산, 트리거만 버튼으로 바뀜)
  function moveToDay(place: PlaceEntry, destDayIndex: number) {
    setItems((prev) => {
      const sourceDayIndex = dayIndexForPlace(place, days);
      if (sourceDayIndex === destDayIndex) return prev;

      const destGroup = groupByDay(prev, days)[destDayIndex];
      const withoutActive = destGroup.filter((p) => p.id !== place.id);
      const newDestGroup = [...withoutActive, place];

      const maxOrder = Math.max(0, ...prev.map((p) => p.order));
      const orderSlots = [...withoutActive.map((p) => p.order), maxOrder + 1].sort((a, b) => a - b);
      const orderById = new Map(newDestGroup.map((p, i) => [p.id, orderSlots[i]]));
      const destDate = days[destDayIndex];

      const next = prev.map((p) => {
        if (p.id === place.id) return { ...p, order: orderById.get(p.id)!, scheduledAt: destDate };
        if (orderById.has(p.id)) return { ...p, order: orderById.get(p.id)! };
        return p;
      });
      next.sort((a, b) => a.order - b.order);

      setSelectedDay(destDayIndex);

      schedulePatch(destDayIndex, () => {
        newDestGroup.forEach((p) => {
          const body: { order: number; scheduledAt?: string } = { order: orderById.get(p.id)! };
          if (p.id === place.id) body.scheduledAt = destDate.toISOString();
          patchPlace(p.id, body);
        });
      });

      return next;
    });
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
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

      {/* 카카오맵을 페이지 전체 배경으로 깔고, 히어로 카드와 오른쪽 패널은 그 위에 뜨는
          오버레이로 바꿔서 버튼으로 열고 닫을 수 있게 한다 */}
      <div className="absolute inset-0">
        <KakaoMapCanvas
          points={points}
          segments={segments}
          selectedPlaceId={selectedPlaceId}
          selectedSegmentId={selectedSegmentId}
          onOpenReviews={setReviewsModalPlaceId}
          onSelectSegment={handleSelectSegment}
        />
      </div>

      {/* 오른쪽 패널 — 히어로(대표사진+제목)를 맨 위에 포함해 AI카드/탭/내용과 한 카드로 합침.
          모바일에서는 하단 시트, sm 이상에서는 오른쪽 위~아래 전체 높이. 래퍼는 패널이 닫혀있어도
          항상 같은 자리를 차지해서, 접기 핸들이 열림/닫힘 상관없이 같은 위치에서 화살표만 바뀐다. */}
      <div
        className={`absolute inset-x-4 bottom-4 z-20 h-[55vh] sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-4 sm:h-auto sm:w-[380px] lg:w-[420px] ${
          sidebarOpen ? "" : "pointer-events-none"
        }`}
      >
        {sidebarOpen ? (
          <aside className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-xl">
            <TripHeroBanner coverPhotoKey={trip.coverPhotoKey}>
              <TripMetaEditor trip={trip} isOwner={isOwner} />
            </TripHeroBanner>

            <div className="flex-none border-b border-neutral-100 p-3">
              <AIAssistantCard href={`/trips/${trip.id}/import`} />
            </div>
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
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PlaceList
                  tripId={trip.id}
                  trip={{ startDate: trip.startDate, endDate: trip.endDate }}
                  places={items}
                  dayStats={dayStats}
                  selectedDay={safeSelectedDay}
                  onSelectDay={setSelectedDay}
                  selectedPlaceId={selectedPlaceId}
                  onSelectPlace={setSelectedPlaceId}
                  onDeletePlace={handleDeletePlace}
                  onDragEnd={handleDragEnd}
                  onMoveToDay={moveToDay}
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
                />
              </div>
            )}
          </aside>
        ) : null}

        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? "패널 접기" : "패널 펼치기"}
          className="pointer-events-auto absolute left-1/2 top-0 z-30 flex h-6 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-lg hover:bg-neutral-50 hover:text-neutral-700 sm:left-0 sm:top-1/2 sm:h-12 sm:w-6 sm:-translate-y-1/2"
        >
          <span className="sm:hidden">
            {sidebarOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </span>
          <span className="hidden sm:block">
            {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </span>
        </button>
      </div>
    </div>
  );
}
