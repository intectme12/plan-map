"use client";

import { useEffect, useRef, useState } from "react";
import { type SharedTripCardData } from "./SharedTripCard";
import { TripGridCard } from "./TripGridCard";

const PAGE_SIZE = 20;

export function SharedTripBrowser() {
  const [q, setQ] = useState("");
  const [trips, setTrips] = useState<SharedTripCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  async function load(cursor: number, query: string, replace: boolean) {
    setLoading(true);
    const res = await fetch(`/api/trips/shared?q=${encodeURIComponent(query)}&cursor=${cursor}`);
    const data: SharedTripCardData[] = res.ok ? await res.json() : [];
    setLoading(false);
    setHasMore(data.length === PAGE_SIZE);
    setTrips((prev) => (replace ? data : [...prev, ...data]));
  }

  const isFirstRun = useRef(true);

  useEffect(() => {
    // 최초 진입 시에는 검색어가 없어 디바운스가 무의미하므로 바로 조회하고,
    // 이후 검색어를 입력할 때만 300ms 디바운스를 건다.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      load(0, q, true);
      return;
    }
    const timer = setTimeout(() => load(0, q, true), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-3">
      <input
        placeholder="지역, 장소, 여행 이름, 닉네임으로 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />

      {loading && trips.length === 0 ? (
        <p className="text-sm text-neutral-400">불러오는 중...</p>
      ) : null}
      {!loading && trips.length === 0 ? (
        <p className="text-sm text-neutral-500">공유된 여행이 없습니다.</p>
      ) : null}

      <div className="grid grid-cols-4 gap-1">
        {trips.map((trip) => (
          <TripGridCard key={trip.id} trip={trip} href={`/trips/shared/${trip.id}`} />
        ))}
      </div>

      {hasMore ? (
        <button
          onClick={() => load(trips.length, q, false)}
          disabled={loading}
          className="self-center rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {loading ? "불러오는 중..." : "더 보기"}
        </button>
      ) : null}
    </div>
  );
}
