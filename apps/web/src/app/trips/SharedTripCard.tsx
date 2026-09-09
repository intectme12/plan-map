"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { UserProfileModal } from "@/components/UserProfileModal";
import { LikeButton } from "@/components/LikeButton";

export type SharedTripCardData = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  personnel: number;
  user: { nickname: string; avatarUrl: string | null };
  _count: { places: number };
  likeCount: number;
  likedByMe: boolean;
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function SharedTripCard({
  trip,
  showOwner = true,
  href,
}: {
  trip: SharedTripCardData;
  showOwner?: boolean;
  href?: string;
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50">
      {showOwner ? (
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex-none"
          aria-label={`${trip.user.nickname} 프로필 보기`}
        >
          <Avatar url={trip.user.avatarUrl} nickname={trip.user.nickname} size={40} />
        </button>
      ) : null}

      <Link
        href={href ?? `/trips/shared/${trip.id}`}
        className="flex min-w-0 flex-1 items-center justify-between"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold">{trip.name}</p>
          <p className="truncate text-sm text-neutral-500">
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · {trip.personnel}명
            {showOwner ? ` · ${trip.user.nickname}` : null}
          </p>
        </div>
        <span className="flex-none text-sm text-neutral-400">장소 {trip._count.places}개</span>
      </Link>

      <LikeButton tripId={trip.id} initialLiked={trip.likedByMe} initialCount={trip.likeCount} />

      {profileOpen ? (
        <UserProfileModal nickname={trip.user.nickname} onClose={() => setProfileOpen(false)} />
      ) : null}
    </div>
  );
}
