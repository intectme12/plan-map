import Link from "next/link";
import { MapPin, Calendar } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { LikeButton } from "@/components/LikeButton";
import { formatTripDuration } from "@/lib/formatTripDuration";

export type DestinationCardData = {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  coverPhotoKey: string | null;
  tags: string[];
  _count: { places: number };
  likeCount: number;
  likedByMe: boolean;
  user: { nickname: string; avatarUrl: string | null };
};

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #2F6FED, #6EA8FE)",
  "linear-gradient(135deg, #FF7A45, #FFB088)",
  "linear-gradient(135deg, #16A34A, #6EE7B7)",
  "linear-gradient(135deg, #D97706, #FCD34D)",
  "linear-gradient(135deg, #7C3AED, #C4B5FD)",
];

function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PLACEHOLDER_GRADIENTS[Math.abs(hash) % PLACEHOLDER_GRADIENTS.length];
}

export function DestinationCard({ trip }: { trip: DestinationCardData }) {
  return (
    <Link
      href={`/trips/shared/${trip.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {trip.coverPhotoKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.coverPhotoKey}
            alt={trip.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center p-4 text-center text-base font-semibold text-white"
            style={{ background: gradientFor(trip.id) }}
          >
            {trip.name}
          </div>
        )}

        <div className="absolute inset-x-3 top-3 flex items-center justify-between">
          <span className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            📍 {trip.name}
          </span>
          <LikeButton
            tripId={trip.id}
            initialLiked={trip.likedByMe}
            initialCount={trip.likeCount}
            className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs text-white backdrop-blur"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <p className="truncate text-base font-semibold text-neutral-900">{trip.name}</p>
        {trip.tags.length > 0 ? (
          <p className="truncate text-xs text-blue-600">{trip.tags.map((t) => `#${t}`).join(" ")}</p>
        ) : null}

        <div className="mt-1 flex items-center justify-between border-t border-neutral-100 pt-3">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-500">
            <Avatar url={trip.user.avatarUrl} nickname={trip.user.nickname} size={20} />
            <span className="truncate">{trip.user.nickname}의 여행기</span>
          </span>
          <span className="flex flex-none items-center gap-2 text-[11px] text-neutral-400">
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {trip._count.places}곳
            </span>
            <span className="flex items-center gap-0.5">
              <Calendar className="h-3 w-3" /> {formatTripDuration(trip.startDate, trip.endDate)}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
