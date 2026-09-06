"use client";

import { useState } from "react";
import { SharedTripCard, type SharedTripCardData } from "@/app/trips/SharedTripCard";

const PAGE_SIZE = 20;

export function UserTripList({
  userId,
  initialTrips,
}: {
  userId: string;
  initialTrips: SharedTripCardData[];
}) {
  const [trips, setTrips] = useState(initialTrips);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialTrips.length === PAGE_SIZE);

  async function loadMore() {
    setLoading(true);
    const res = await fetch(`/api/trips/shared?userId=${userId}&cursor=${trips.length}`);
    const data: SharedTripCardData[] = res.ok ? await res.json() : [];
    setLoading(false);
    setHasMore(data.length === PAGE_SIZE);
    setTrips((prev) => [...prev, ...data]);
  }

  if (trips.length === 0) {
    return <p className="text-sm text-neutral-500">공유 중인 여행이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {trips.map((trip) => (
          <li key={trip.id}>
            <SharedTripCard trip={trip} showOwner={false} />
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          onClick={loadMore}
          disabled={loading}
          className="self-center rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {loading ? "불러오는 중..." : "더 보기"}
        </button>
      ) : null}
    </div>
  );
}
