import { PlacePhotos } from "./PlacePhotos";
import { Chevron } from "./PlaceList";
import { getTripDays, groupByDay, formatDayLabel, dayColor } from "./days";
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
          <div key={dayIndex} className="rounded-md border border-neutral-200">
            <button
              type="button"
              onClick={() => onToggleDay(dayIndex)}
              className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <Chevron open={open} />
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: dayColor(dayIndex) }}
              />
              <span className="flex-1">{formatDayLabel(date, dayIndex + 1)}</span>
              {dayPlaces.length > 0 ? (
                <span className="flex-none text-xs font-normal text-neutral-400">{dayPlaces.length}곳</span>
              ) : null}
            </button>

            {open ? (
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
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
