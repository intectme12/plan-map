"use client";

import { DayTabSelector } from "@/app/trips/[tripId]/DayTabSelector";
import { RouteSegmentRow } from "@/app/trips/[tripId]/RouteSegmentRow";
import { getTripDays, groupByDay, dayColor, formatDayLabel } from "@/app/trips/[tripId]/days";
import type { PlaceEntry } from "@/app/trips/[tripId]/types";

type DayStat = { placeCount: number; durationSec: number; distanceM: number; cost: number };

// 내 여행계획(PlaceList.tsx)과 같은 "날짜 하나만 선택하는 탭" 레이아웃 — 읽기 전용이라
// 드래그 정렬/삭제/장소 추가/다른 날짜로 이동 같은 편집 기능만 빠져있다.
export function SharedPlaceList({
  tripId,
  trip,
  places,
  dayStats,
  selectedDay,
  onSelectDay,
  selectedPlaceId,
  onSelectPlace,
}: {
  tripId: string;
  trip: { startDate: string | Date; endDate: string | Date };
  places: PlaceEntry[];
  dayStats: DayStat[];
  selectedDay: number;
  onSelectDay: (dayIndex: number) => void;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
}) {
  const days = getTripDays(trip.startDate, trip.endDate);
  const groups = groupByDay(places, days);

  const safeSelectedDay = Math.min(selectedDay, days.length - 1);
  const currentDate = days[safeSelectedDay];
  const currentGroup = groups[safeSelectedDay] ?? [];
  const stats = dayStats[safeSelectedDay] ?? { placeCount: 0, durationSec: 0, distanceM: 0, cost: 0 };

  return (
    <div className="flex h-full flex-col">
      <DayTabSelector days={days} selectedDay={safeSelectedDay} onSelect={onSelectDay} />

      <div className="mx-3 mb-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-900">{formatDayLabel(currentDate, safeSelectedDay + 1)}</p>
          <span className="flex-none rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
            {stats.placeCount}곳
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span>🚗 {stats.durationSec > 0 ? `${Math.round(stats.durationSec / 60)}분` : "-"}</span>
          <span>📍 {stats.distanceM > 0 ? `${(stats.distanceM / 1000).toFixed(1)}km` : "-"}</span>
          <span className="font-semibold text-amber-600">₩{stats.cost.toLocaleString()}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {currentGroup.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-neutral-400">이 날짜에 등록된 장소가 없습니다.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {currentGroup.map((place, index) => {
              const nextPlace = currentGroup[index + 1] ?? null;
              const thumbnail = place.photos[0]?.storageKey;
              return (
                <li
                  key={place.id}
                  className={`overflow-hidden rounded-2xl border shadow-[0_2px_10px_rgba(15,23,42,0.05)] ${
                    selectedPlaceId === place.id ? "border-blue-300 bg-blue-50/40" : "border-neutral-100 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPlace(place.id)}
                    className="flex w-full items-start gap-2 px-3 py-3 text-left"
                  >
                    <span
                      className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: dayColor(safeSelectedDay) }}
                    >
                      {index + 1}
                    </span>
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnail} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-900">{place.name}</p>
                      {place.address ? (
                        <p className="truncate text-xs text-neutral-400">{place.address}</p>
                      ) : null}
                      {place.category ? (
                        <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                          {place.category}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {nextPlace ? (
                    <RouteSegmentRow tripId={tripId} fromPlaceId={place.id} toPlaceId={nextPlace.id} />
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
