"use client";

import { useState } from "react";

export function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="flex-none">
      <path
        d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z"
        fill={filled ? "#facc15" : "none"}
        stroke={filled ? "#facc15" : "#d4d4d4"}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 공유 열람(읽기 전용) 화면에서 클릭 없이 별점만 보여줄 때 쓴다
export function StaticStars({ rating }: { rating: number }) {
  return (
    <div className="flex flex-none items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} filled={value <= rating} />
      ))}
    </div>
  );
}

export function PlaceRating({
  tripId,
  placeId,
  initialRating,
}: {
  tripId: string;
  placeId: string;
  initialRating: number;
}) {
  const [rating, setRating] = useState(initialRating);
  const [hovered, setHovered] = useState<number | null>(null);

  async function onRate(value: number) {
    const prev = rating;
    setRating(value);
    const res = await fetch(`/api/trips/${tripId}/places/${placeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: value }),
    });
    if (!res.ok) setRating(prev);
  }

  const shown = hovered ?? rating;

  return (
    <div
      className="flex flex-none items-center gap-0.5"
      onMouseLeave={() => setHovered(null)}
      onClick={(e) => e.stopPropagation()}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onRate(value)}
          onMouseEnter={() => setHovered(value)}
          aria-label={`${value}점`}
          className="p-0.5"
        >
          <Star filled={value <= shown} />
        </button>
      ))}
    </div>
  );
}
