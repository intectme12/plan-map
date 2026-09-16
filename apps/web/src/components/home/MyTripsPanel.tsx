import Link from "next/link";
import { MapPin } from "lucide-react";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";
import { formatDateRange } from "@/lib/formatTripDuration";

type FeaturedTrip = {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  places: { id: string; name: string; lat: number; lng: number }[];
  _count: { places: number };
};

export function MyTripsPanel({ trip }: { trip: FeaturedTrip | null }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-900">내 여행계획</h2>
        <Link href="/trips" className="text-xs font-medium text-neutral-500 hover:text-blue-600">
          전체보기 →
        </Link>
      </div>

      {trip ? (
        <div className="relative h-72 overflow-hidden rounded-2xl border border-neutral-100 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
          <KakaoMapCanvas points={trip.places} />

          <Link
            href={`/trips/${trip.id}`}
            className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-xl bg-white/95 p-3 shadow-lg backdrop-blur hover:bg-white"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-neutral-900">{trip.name}</span>
              <span className="block truncate text-xs text-neutral-500">
                {formatDateRange(trip.startDate, trip.endDate)}
              </span>
            </span>
            <span className="flex-none text-xs text-neutral-400">📍 {trip._count.places}곳</span>
          </Link>
        </div>
      ) : (
        <Link
          href="/trips"
          className="flex h-72 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 text-sm text-neutral-400 hover:border-blue-300 hover:text-blue-600"
        >
          <MapPin className="h-6 w-6" />
          아직 만든 여행이 없어요. 첫 여행을 만들어보세요.
        </Link>
      )}
    </section>
  );
}
