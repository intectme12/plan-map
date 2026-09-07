"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Review = {
  id: string;
  content: string;
  createdAt: string | Date;
  author: { nickname: string };
};

function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function PlaceReviews({
  tripId,
  placeId,
  initialReviews,
}: {
  tripId: string;
  placeId: string;
  initialReviews: Review[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);
    setPending(true);
    const res = await fetch(`/api/trips/${tripId}/places/${placeId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(typeof data?.error === "string" ? data.error : "후기를 저장하지 못했습니다.");
      return;
    }
    const review: Review = await res.json();
    setReviews((prev) => [review, ...prev]);
    setContent("");
    router.refresh();
  }

  async function onDelete(reviewId: string) {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    await fetch(`/api/trips/${tripId}/places/${placeId}/reviews/${reviewId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={onSubmit} className="flex gap-1.5">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="이 장소에서의 후기를 남겨보세요"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
        />
        <button
          type="submit"
          disabled={pending || !content.trim()}
          className="flex-none rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 disabled:opacity-50"
        >
          {pending ? "저장 중..." : "등록"}
        </button>
      </form>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {reviews.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="group flex items-start justify-between gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-xs text-neutral-700">{review.content}</p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {review.author.nickname} · {formatDateTime(review.createdAt)}
                </p>
              </div>
              <button
                onClick={() => onDelete(review.id)}
                className="flex-none text-[11px] text-neutral-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-neutral-400">아직 후기가 없습니다.</p>
      )}
    </div>
  );
}
