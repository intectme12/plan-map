import { PlacePhotos } from "./PlacePhotos";
import { DayAccordionSection } from "./DayAccordionSection";
import { getTripDays, groupByDay } from "./days";
import type { PlaceEntry } from "./types";

export function PhotoGallery({
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
  if (places.length === 0) {
    return <p className="p-4 text-sm text-neutral-500">장소를 먼저 추가해주세요.</p>;
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
                    <PlacePhotos tripId={tripId} placeId={place.id} initialPhotos={place.photos} />
                  </div>
                ))
              )}
            </div>
          </DayAccordionSection>
        );
      })}
    </div>
  );
}
