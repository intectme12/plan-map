"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";
import { ExpenseSummary } from "@/app/trips/[tripId]/ExpenseSummary";
import { getTripDays, groupByDay, dayColor } from "@/app/trips/[tripId]/days";
import type { PlaceEntry } from "@/app/trips/[tripId]/types";
import { SharedPlaceList } from "./SharedPlaceList";
import { SharedPhotoGrid } from "./SharedPhotoGrid";
import { CopyTripButton } from "./CopyTripButton";

const TABS = [
  { key: "timeline", label: "타임라인" },
  { key: "expense", label: "비용" },
  { key: "photos", label: "사진" },
] as const;

type TripMeta = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  personnel: number;
  ownerNickname: string;
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const points = useMemo(
    () =>
      places.map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        category: p.category,
        address: p.address,
        roadAddress: p.roadAddress,
        phone: p.phone,
        placeUrl: p.placeUrl,
      })),
    [places]
  );

  const days = useMemo(
    () => getTripDays(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );
  const groups = useMemo(() => groupByDay(places, days), [places, days]);

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
    <main className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0">
        <KakaoMapCanvas points={points} segments={segments} selectedPlaceId={selectedPlaceId} />
      </div>

      <Link
        href="/trips?tab=shared"
        className="absolute left-4 top-4 z-10 rounded-md bg-white px-3 py-1.5 text-sm font-semibold shadow"
      >
        ← 다른 사람 여행계획
      </Link>

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
        <header className="flex flex-col gap-2 border-b border-neutral-200 p-4">
          <div>
            <h1 className="text-lg font-bold">{trip.name}</h1>
            <p className="text-sm text-neutral-500">
              {new Date(trip.startDate).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}{" "}
              – {new Date(trip.endDate).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })} ·{" "}
              {trip.personnel}명 · {trip.ownerNickname}
            </p>
          </div>
          {isOwnTrip ? (
            <span className="self-start rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-500">
              내가 만든 여행입니다
            </span>
          ) : (
            <CopyTripButton tripId={trip.id} />
          )}
        </header>

        <nav className="flex gap-1 border-b border-neutral-200 px-3">
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
          <div className="min-h-0 flex-1">
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
        ) : (
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
        )}
      </aside>
    </main>
  );
}
