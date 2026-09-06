import Link from "next/link";

export type SharedTripCardData = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  personnel: number;
  user: { nickname: string };
  _count: { places: number };
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function SharedTripCard({
  trip,
  showOwner = true,
}: {
  trip: SharedTripCardData;
  showOwner?: boolean;
}) {
  return (
    <Link
      href={`/trips/shared/${trip.id}`}
      className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
    >
      <div>
        <p className="font-semibold">{trip.name}</p>
        <p className="text-sm text-neutral-500">
          {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · {trip.personnel}명
          {showOwner ? ` · ${trip.user.nickname}` : null}
        </p>
      </div>
      <span className="text-sm text-neutral-400">장소 {trip._count.places}개</span>
    </Link>
  );
}
