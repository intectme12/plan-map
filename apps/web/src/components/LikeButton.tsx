"use client";

import { useState } from "react";

export function LikeButton({
  tripId,
  initialLiked,
  initialCount,
  className,
}: {
  tripId: string;
  initialLiked: boolean;
  initialCount: number;
  className?: string;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const next = !liked;
    setPending(true);
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));

    const res = await fetch(`/api/trips/${tripId}/like`, { method: next ? "POST" : "DELETE" });

    setPending(false);

    if (!res.ok) {
      setLiked(!next);
      setCount((c) => c - (next ? 1 : -1));
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? "좋아요 취소" : "좋아요"}
      className={
        className ??
        `flex flex-none items-center gap-1 rounded-md px-2 py-1 text-sm ${
          liked ? "text-red-500" : "text-neutral-400 hover:text-neutral-600"
        }`
      }
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      <span>{count}</span>
    </button>
  );
}
