"use client";

import { useState } from "react";
import { DayAccordionSection } from "@/app/trips/[tripId]/DayAccordionSection";
import { PhotoLightbox } from "@/app/trips/[tripId]/PhotoLightbox";
import { getTripDays, groupByDay } from "@/app/trips/[tripId]/days";
import type { PlaceEntry } from "@/app/trips/[tripId]/types";

export function SharedPhotoGrid({
  trip,
  places,
  selectedPlaceId,
  onSelectPlace,
  expandedDays,
  onToggleDay,
}: {
  trip: { startDate: string | Date; endDate: string | Date };
  places: PlaceEntry[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  expandedDays: Set<number>;
  onToggleDay: (dayIndex: number) => void;
}) {
  const [lightbox, setLightbox] = useState<{ photos: PlaceEntry["photos"]; index: number } | null>(
    null
  );

  if (places.length === 0) {
    return <p className="p-4 text-sm text-neutral-500">등록된 장소가 없습니다.</p>;
  }

  const days = getTripDays(trip.startDate, trip.endDate);
  const groups = groupByDay(places, days);

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-2">
      {days.map((date, dayIndex) => {
        const dayPlaces = groups[dayIndex];
        const open = expandedDays.has(dayIndex);

        return (
          <DayAccordionSection
            key={dayIndex}
            dayIndex={dayIndex}
            date={date}
            dayNumber={dayIndex + 1}
            count={dayPlaces.length}
            open={open}
            onToggle={() => onToggleDay(dayIndex)}
          >
            <div className="flex flex-col gap-5 border-t border-neutral-200 p-3">
              {dayPlaces.length === 0 ? (
                <p className="px-1 py-2 text-xs text-neutral-400">등록된 장소가 없습니다.</p>
              ) : (
                dayPlaces.map((place) => (
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
                ))
              )}
            </div>
          </DayAccordionSection>
        );
      })}

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
