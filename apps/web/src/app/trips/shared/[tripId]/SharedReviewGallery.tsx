import { DayAccordionSection } from "@/app/trips/[tripId]/DayAccordionSection";
import { StaticStars } from "@/app/trips/[tripId]/PlaceRating";
import { getTripDays, groupByDay } from "@/app/trips/[tripId]/days";
import type { PlaceEntry } from "@/app/trips/[tripId]/types";

function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function SharedReviewGallery({
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
                ))
              )}
            </div>
          </DayAccordionSection>
        );
      })}
    </div>
  );
}
