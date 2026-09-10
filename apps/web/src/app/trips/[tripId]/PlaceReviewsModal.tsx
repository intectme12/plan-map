"use client";

import { Modal } from "@/components/Modal";
import { StaticStars } from "./PlaceRating";

type ReviewItem = {
  id: string;
  rating: number;
  content: string;
  createdAt: string | Date;
  author: { nickname: string };
};

function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

// 지도 마커 팝업의 "후기 N개"를 눌렀을 때 뜨는 읽기전용 후기 목록 — 다른 트립에서 같은
// 좌표에 독립적으로 추가된 후기까지 전부 포함된 값을 그대로 받아서 보여준다(PlaceEntry.reviews).
export function PlaceReviewsModal({
  placeName,
  reviews,
  onClose,
}: {
  placeName: string;
  reviews: ReviewItem[];
  onClose: () => void;
}) {
  return (
    <Modal title={`${placeName} 후기`} onClose={onClose} scrollable>
      {reviews.length === 0 ? (
        <p className="text-sm text-neutral-400">아직 후기가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
              <StaticStars rating={review.rating} />
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{review.content}</p>
              <p className="mt-1 text-xs text-neutral-400">
                {review.author.nickname} · {formatDateTime(review.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
