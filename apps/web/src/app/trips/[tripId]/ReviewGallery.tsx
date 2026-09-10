import { PlaceReviews } from "./PlaceReviews";
import { StaticStars } from "./PlaceRating";
import { DayAccordionSection } from "./DayAccordionSection";
import { getTripDays, groupByDay } from "./days";
import type { PlaceEntry } from "./types";

export function ReviewGallery({
  tripId,
  trip,
  places,
  currentUserId,
  selectedPlaceId,
  onSelectPlace,
  expandedDays,
  onToggleDay,
}: {
  tripId: string;
  trip: { startDate: string | Date; endDate: string | Date };
  places: PlaceEntry[];
  currentUserId: string;
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
                ))
              )}
            </div>
          </DayAccordionSection>
        );
      })}
    </div>
  );
}
