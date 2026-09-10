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

// 후기 작성 폼에서 별점을 고를 때 쓴다 — 별점은 이제 장소가 아니라 각 후기에 딸린 개인 값이라
// 여기서 값을 들고 있지 않고 부모(PlaceReviews)의 폼 상태를 그대로 조작한다.
export function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value;

  return (
    <div className="flex flex-none items-center gap-0.5" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          onMouseEnter={() => setHovered(v)}
          aria-label={`${v}점`}
          className="p-0.5"
        >
          <Star filled={v <= shown} />
        </button>
      ))}
    </div>
  );
}
