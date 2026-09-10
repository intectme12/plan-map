"use client";

import { useEffect, useRef, useState } from "react";
import { type SharedTripCardData } from "./SharedTripCard";
import { TripGridCard } from "./TripGridCard";

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

      <div className="grid grid-cols-4 gap-1">
        {trips.map((trip) => (
          <TripGridCard key={trip.id} trip={trip} href={`/trips/shared/${trip.id}`} />
        ))}
      </div>

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
