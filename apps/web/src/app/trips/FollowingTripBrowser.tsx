"use client";

import { useEffect, useRef, useState } from "react";
import { SharedTripCard, type SharedTripCardData } from "./SharedTripCard";

const PAGE_SIZE = 20;

export function FollowingTripBrowser() {
  const [trips, setTrips] = useState<SharedTripCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  async function load(cursor: number, replace: boolean) {
    setLoading(true);
    const res = await fetch(`/api/trips/following?cursor=${cursor}`);
    const data: SharedTripCardData[] = res.ok ? await res.json() : [];
    setLoading(false);
    setHasMore(data.length === PAGE_SIZE);
    setTrips((prev) => (replace ? data : [...prev, ...data]));
  }

  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      load(0, true);
    }
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {loading && trips.length === 0 ? (
        <p className="text-sm text-neutral-400">불러오는 중...</p>
      ) : null}
      {!loading && trips.length === 0 ? (
        <p className="text-sm text-neutral-500">
          팔로우한 회원이 공개한 여행이 없습니다. 회원검색에서 팔로우해보세요.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {trips.map((trip) => (
          <li key={trip.id}>
            <SharedTripCard trip={trip} />
          </li>
        ))}
      </ul>

      {hasMore ? (
        <button
          onClick={() => load(trips.length, false)}
          disabled={loading}
          className="self-center rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {loading ? "불러오는 중..." : "더 보기"}
        </button>
      ) : null}
    </div>
  );
}
