"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { UserProfileModal } from "@/components/UserProfileModal";
import { LikeButton } from "@/components/LikeButton";

export type TripGridCardData = {
  id: string;
  name: string;
  coverPhotoKey: string | null;
  _count: { places: number };
  likeCount?: number;
  likedByMe?: boolean;
  user?: { nickname: string; avatarUrl: string | null };
};

// 대표사진이 없는 트립은 이름 글자를 보여주는 타일이 되는데, 매번 같은 색이면 단조로우니
// id를 해시해서 고정된 그라데이션 하나를 고른다(외부 의존성 없이 순수 CSS로).
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

export function TripGridCard({
  trip,
  href,
  onDelete,
}: {
  trip: TripGridCardData;
  href: string;
  onDelete?: (trip: TripGridCardData) => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const hasLike = trip.likeCount !== undefined && trip.likedByMe !== undefined;

  return (
    <Link href={href} className="group relative block aspect-square overflow-hidden rounded-md bg-neutral-100">
      {trip.coverPhotoKey ? (
        <img src={trip.coverPhotoKey} alt={trip.name} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center p-3 text-center text-sm font-semibold text-white"
          style={{ background: gradientFor(trip.id) }}
        >
          {trip.name}
        </div>
      )}

      {trip.user ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setProfileOpen(true);
          }}
          aria-label={`${trip.user.nickname} 프로필 보기`}
          className="absolute left-1.5 top-1.5 rounded-full ring-2 ring-white/80"
        >
          <Avatar url={trip.user.avatarUrl} nickname={trip.user.nickname} size={28} />
        </button>
      ) : null}

      {onDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(trip);
          }}
          aria-label={`${trip.name} 삭제`}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          🗑
        </button>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        <span>장소 {trip._count.places}개</span>
        {hasLike ? (
          <LikeButton
            tripId={trip.id}
            initialLiked={trip.likedByMe!}
            initialCount={trip.likeCount!}
            className="flex items-center gap-1 text-white"
          />
        ) : null}
      </div>

      {profileOpen && trip.user ? (
        <UserProfileModal nickname={trip.user.nickname} onClose={() => setProfileOpen(false)} />
      ) : null}
    </Link>
  );
}
