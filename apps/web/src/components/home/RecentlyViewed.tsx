import Link from "next/link";
import { MapPin } from "lucide-react";
import { listRecentlyViewedTrips } from "@/lib/services/tripViews";
import { formatDateRange } from "@/lib/formatTripDuration";

export async function RecentlyViewed({ userId }: { userId: string }) {
  const trips = await listRecentlyViewedTrips(userId, 3);
  if (trips.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-900">최근 본 여행</h2>
        <Link href="/trips" className="text-xs font-medium text-neutral-500 hover:text-blue-600">
          전체보기 →
        </Link>
      </div>
      <ul className="flex flex-col gap-1">
        {trips.map((trip) => (
          <li key={trip.id}>
            <Link
              href={trip.userId === userId ? `/trips/${trip.id}` : `/trips/shared/${trip.id}`}
              className="flex items-center gap-3 rounded-xl p-2 hover:bg-neutral-50"
            >
              <span className="h-11 w-11 flex-none overflow-hidden rounded-lg bg-neutral-100">
                {trip.coverPhotoKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={trip.coverPhotoKey} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-neutral-400">✈</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-neutral-900">{trip.name}</span>
                <span className="block text-xs text-neutral-500">
                  {formatDateRange(trip.startDate, trip.endDate)}
                </span>
              </span>
              <span className="flex flex-none items-center gap-1 text-xs text-neutral-400">
                <MapPin className="h-3 w-3" /> {trip._count.places}곳
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
