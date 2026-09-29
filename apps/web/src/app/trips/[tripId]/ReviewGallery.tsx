"use client";

import { PlaceReviews } from "./PlaceReviews";
import { StaticStars } from "./PlaceRating";
import { DayTabSelector } from "./DayTabSelector";
import { getTripDays, groupByDay, formatDayLabel } from "./days";
import type { PlaceEntry } from "./types";

// 타임라인 탭과 같은 날짜 pill 탭(한 번에 하나만 선택)으로 전환 — 후기 탭 자체만의
// 선택 상태라 타임라인에서 보고 있는 날짜와는 독립적이다(선택 state는 지도 포커스에
// 반영할 수 있도록 TripWorkspace가 들고 있고, 여기선 controlled prop으로만 받는다).
export function ReviewGallery({
  tripId,
  trip,
  places,
  currentUserId,
  selectedDay,
  onSelectDay,
  selectedPlaceId,
  onSelectPlace,
}: {
  tripId: string;
  trip: { startDate: string | Date; endDate: string | Date };
  places: PlaceEntry[];
  currentUserId: string;
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

  return (
    <div className="flex h-full flex-col">
      <DayTabSelector days={days} selectedDay={safeSelectedDay} onSelect={onSelectDay} />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <p className="mb-2 text-sm font-bold text-neutral-900">
          {formatDayLabel(currentDate, safeSelectedDay + 1)}
        </p>
        {currentGroup.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-neutral-400">이 날짜에 등록된 장소가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {currentGroup.map((place) => (
              <div key={place.id}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPlace(place.id)}
                    className={`rounded px-1 -mx-1 text-left text-sm font-semibold hover:bg-neutral-50 ${
                      selectedPlaceId === place.id ? "bg-blue-50" : ""
                    }`}
                  >
                    {place.name}
                  </button>
                  <div className="flex flex-none items-center gap-1">
                    <StaticStars rating={place.avgRating ?? 0} />
                    <span className="text-xs text-neutral-400">({place.reviewCount})</span>
                  </div>
                </div>
                <PlaceReviews
                  tripId={tripId}
                  placeId={place.id}
                  currentUserId={currentUserId}
                  initialReviews={place.reviews}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
