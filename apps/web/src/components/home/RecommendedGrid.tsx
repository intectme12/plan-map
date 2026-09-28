"use client";

import { useEffect, useRef, useState } from "react";
import { useHomeCategory } from "./HomeCategoryProvider";
import { DestinationCard, type DestinationCardData } from "./DestinationCard";

// CategoryNav.tsx에서 카테고리를 바꾸면(HomeCategoryProvider 공유 상태) 페이지 전체를 다시
// 불러오는 대신 이 그리드만 /api/home/recommended로 다시 fetch한다. lastFetchedRef로 첫
// 렌더(서버가 이미 내려준 initialTrips)와 같은 카테고리면 중복 요청하지 않는다.
export function RecommendedGrid({
  initialTrips,
  initialCategory,
  viewerLoggedIn,
}: {
  initialTrips: DestinationCardData[];
  initialCategory?: string;
  viewerLoggedIn: boolean;
}) {
  const { category } = useHomeCategory();
  const [trips, setTrips] = useState(initialTrips);
  const [loading, setLoading] = useState(false);
  const lastFetchedRef = useRef(initialCategory);

  useEffect(() => {
    if (category === lastFetchedRef.current) return;
    lastFetchedRef.current = category;

    let cancelled = false;
    setLoading(true);
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    fetch(`/api/home/recommended${qs}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DestinationCardData[]) => {
        if (!cancelled) setTrips(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">추천 여행지</h2>
          <p className="mt-1 text-sm text-neutral-500">지금 가장 인기 있는 여행지를 확인해보세요.</p>
        </div>
      </div>

      {trips.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-400">
          {category ? `#${category} 태그의 공개 여행이 아직 없어요.` : "공개된 여행이 아직 없어요."}
        </p>
      ) : (
        <div
          className={`mt-6 grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-4 ${
            loading ? "opacity-50" : ""
          }`}
        >
          {trips.map((trip) => (
            <DestinationCard key={trip.id} trip={trip} viewerLoggedIn={viewerLoggedIn} />
          ))}
        </div>
      )}
    </section>
  );
}
