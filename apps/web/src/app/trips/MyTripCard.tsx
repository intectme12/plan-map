"use client";

import Link from "next/link";
import { MapPin, Calendar } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { LikeButton } from "@/components/LikeButton";
import { formatTripDuration, formatDateRange } from "@/lib/formatTripDuration";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { TripCardMenu } from "./TripCardMenu";

export type MyTripCardData = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  personnel: number;
  visibility: string;
  coverPhotoKey: string | null;
  tags: string[];
  updatedAt: string | Date;
  _count: { places: number };
  likeCount: number;
  likedByMe: boolean;
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

export function MyTripCard({
  trip,
  nickname,
  avatarUrl,
  onDelete,
}: {
  trip: MyTripCardData;
  nickname: string;
  avatarUrl: string | null;
  onDelete: () => void;
}) {
  return (
    <Link
      href={`/trips/${trip.id}`}
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

        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="truncate rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            📍 {trip.name}
          </span>
          <TripCardMenu trip={trip} ownerNickname={nickname} onDelete={onDelete} />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <p className="truncate text-base font-semibold text-neutral-900">{trip.name}</p>
        <p className="text-xs text-neutral-500">{formatDateRange(trip.startDate, trip.endDate)}</p>
        {trip.tags.length > 0 ? (
          <p className="truncate text-xs text-blue-600">{trip.tags.map((t) => `#${t}`).join(" ")}</p>
        ) : null}

        <div className="mt-1 flex items-center justify-between border-t border-neutral-100 pt-3">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-500">
            <Avatar url={avatarUrl} nickname={nickname} size={20} />
            <span className="truncate">{nickname}</span>
            <span className="flex-none text-neutral-300">·</span>
            <span className="flex-none text-neutral-400">{formatRelativeTime(trip.updatedAt)}</span>
          </span>
          <span className="flex flex-none items-center gap-2 text-[11px] text-neutral-400">
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {trip._count.places}곳
            </span>
            <span className="flex items-center gap-0.5">
              <Calendar className="h-3 w-3" /> {formatTripDuration(trip.startDate, trip.endDate)}
            </span>
            {trip.visibility !== "PRIVATE" ? (
              <LikeButton
                tripId={trip.id}
                initialLiked={trip.likedByMe}
                initialCount={trip.likeCount}
                className="flex items-center gap-1"
              />
            ) : null}
          </span>
        </div>
      </div>
    </Link>
  );
}
