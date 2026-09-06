"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const PAGE_SIZE = 20;

type SharedTrip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  personnel: number;
  user: { nickname: string };
  _count: { places: number };
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function SharedTripBrowser() {
  const [q, setQ] = useState("");
  const [trips, setTrips] = useState<SharedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  async function load(cursor: number, query: string, replace: boolean) {
    setLoading(true);
    const res = await fetch(`/api/trips/shared?q=${encodeURIComponent(query)}&cursor=${cursor}`);
    const data: SharedTrip[] = res.ok ? await res.json() : [];
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
        placeholder="지역, 장소, 여행 이름으로 검색"
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

      <ul className="flex flex-col gap-2">
        {trips.map((trip) => (
          <li key={trip.id}>
            <Link
              href={`/trips/shared/${trip.id}`}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
            >
              <div>
                <p className="font-semibold">{trip.name}</p>
                <p className="text-sm text-neutral-500">
                  {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · {trip.personnel}명 ·{" "}
                  {trip.user.nickname}
                </p>
              </div>
              <span className="text-sm text-neutral-400">장소 {trip._count.places}개</span>
            </Link>
          </li>
        ))}
      </ul>

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
