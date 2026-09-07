"use client";

import { DayAccordionSection } from "@/app/trips/[tripId]/DayAccordionSection";
import { RouteSegmentRow } from "@/app/trips/[tripId]/RouteSegmentRow";
import { getTripDays, groupByDay } from "@/app/trips/[tripId]/days";
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
            <div className="border-t border-neutral-200 p-2">
              {dayPlaces.length === 0 ? (
                <p className="px-1 py-2 text-xs text-neutral-400">등록된 장소가 없습니다.</p>
              ) : (
                <ol className="flex flex-col gap-1">
                  {dayPlaces.map((place, index) => {
                    const nextPlace = dayPlaces[index + 1] ?? nextGroup?.[0] ?? null;
                    return (
                      <li key={place.id}>
                        <button
                          type="button"
                          onClick={() => onSelectPlace(place.id)}
                          className={`flex w-full items-start gap-2 rounded-md px-1 py-2 text-left hover:bg-neutral-50 ${
                            selectedPlaceId === place.id ? "bg-blue-50" : ""
                          }`}
                        >
                          <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border border-neutral-300 text-[11px] font-semibold text-neutral-600">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{place.name}</p>
                            {place.address ? (
                              <p className="truncate text-xs text-neutral-400">{place.address}</p>
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
