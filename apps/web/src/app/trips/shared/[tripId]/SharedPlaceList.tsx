"use client";

import { DayAccordionSection } from "@/app/trips/[tripId]/DayAccordionSection";
import { RouteSegmentRow } from "@/app/trips/[tripId]/RouteSegmentRow";
import { getTripDays, groupByDay, dayColor } from "@/app/trips/[tripId]/days";
import type { PlaceEntry } from "@/app/trips/[tripId]/types";

export function SharedPlaceList({
  tripId,
  trip,
  places,
  selectedPlaceId,
  onSelectPlace,
  expandedDays,
  onToggleDay,
}: {
  tripId: string;
  trip: { startDate: string | Date; endDate: string | Date };
  places: PlaceEntry[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  expandedDays: Set<number>;
  onToggleDay: (dayIndex: number) => void;
}) {
  const days = getTripDays(trip.startDate, trip.endDate);
  const groups = groupByDay(places, days);

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-2">
      {days.map((date, dayIndex) => {
        const dayPlaces = groups[dayIndex];
        const nextGroup = groups.slice(dayIndex + 1).find((g) => g.length > 0);
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
            <div className="p-2">
              {dayPlaces.length === 0 ? (
                <p className="px-1 py-2 text-xs text-neutral-400">등록된 장소가 없습니다.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {dayPlaces.map((place, index) => {
                    const nextPlace = dayPlaces[index + 1] ?? nextGroup?.[0] ?? null;
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
                            style={{ background: dayColor(dayIndex) }}
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
                          <RouteSegmentRow
                            tripId={tripId}
                            fromPlaceId={place.id}
                            toPlaceId={nextPlace.id}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </DayAccordionSection>
        );
      })}
    </div>
  );
}
