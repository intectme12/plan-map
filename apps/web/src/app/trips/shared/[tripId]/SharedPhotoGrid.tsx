"use client";

import { useState } from "react";
import { DayTabSelector } from "@/app/trips/[tripId]/DayTabSelector";
import { PhotoLightbox } from "@/app/trips/[tripId]/PhotoLightbox";
import { getTripDays, groupByDay, formatDayLabel } from "@/app/trips/[tripId]/days";
import type { PlaceEntry } from "@/app/trips/[tripId]/types";

// 내 여행계획(PhotoGallery.tsx)과 같은 "날짜 하나만 선택하는 탭" 레이아웃. 타임라인 탭에서
// 보고 있는 날짜와는 독립적인 이 탭만의 선택 상태(owner용과 동일한 구조, 선택 state는 지도
// 포커스에 반영할 수 있도록 SharedTripView가 들고 있고, 여기선 controlled prop으로만 받는다).
export function SharedPhotoGrid({
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
  const [lightbox, setLightbox] = useState<{ photos: PlaceEntry["photos"]; index: number } | null>(
    null
  );

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
                <button
                  type="button"
                  onClick={() => onSelectPlace(place.id)}
                  className={`mb-2 rounded px-1 -mx-1 text-left text-sm font-semibold hover:bg-neutral-50 ${
                    selectedPlaceId === place.id ? "bg-blue-50" : ""
                  }`}
                >
                  {place.name}
                </button>
                {place.photos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {place.photos.map((photo, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={photo.id}
                        src={photo.storageKey}
                        alt=""
                        onClick={() => setLightbox({ photos: place.photos, index: i })}
                        className="h-20 w-20 cursor-pointer rounded-md object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">사진이 없습니다.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox ? (
        <PhotoLightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
        />
      ) : null}
    </div>
  );
}
