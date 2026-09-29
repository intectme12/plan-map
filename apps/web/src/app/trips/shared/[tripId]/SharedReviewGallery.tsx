"use client";

import { DayTabSelector } from "@/app/trips/[tripId]/DayTabSelector";
import { StaticStars } from "@/app/trips/[tripId]/PlaceRating";
import { getTripDays, groupByDay, formatDayLabel } from "@/app/trips/[tripId]/days";
import type { PlaceEntry } from "@/app/trips/[tripId]/types";

function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

// 내 여행계획(ReviewGallery.tsx)과 같은 "날짜 하나만 선택하는 탭" 레이아웃. 타임라인 탭에서
// 보고 있는 날짜와는 독립적인 이 탭만의 선택 상태(owner용과 동일한 구조, 선택 state는 지도
// 포커스에 반영할 수 있도록 SharedTripView가 들고 있고, 여기선 controlled prop으로만 받는다).
export function SharedReviewGallery({
  trip,
  places,
  selectedDay,
  onSelectDay,
  selectedPlaceId,
  onSelectPlace,
}: {
  trip: { startDate: string | Date; endDate: string | Date };
  places: PlaceEntry[];
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

                {place.reviews.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {place.reviews.map((review) => (
                      <li
                        key={review.id}
                        className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2"
                      >
                        <StaticStars rating={review.rating} />
                        <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-700">{review.content}</p>
                        <p className="mt-1 text-[11px] text-neutral-400">
                          {review.author.nickname} · {formatDateTime(review.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-neutral-400">아직 후기가 없습니다.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
