"use client";

import { useEffect, useState } from "react";

type RouteData = {
  distanceM: number;
  durationSec: number;
  fareWon: number | null;
};

type FetchState = "loading" | "unavailable" | "ready";

export function RouteSegmentRow({
  tripId,
  fromPlaceId,
  toPlaceId,
}: {
  tripId: string;
  fromPlaceId: string;
  toPlaceId: string;
}) {
  const [state, setState] = useState<FetchState>("loading");
  const [data, setData] = useState<RouteData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    fetch(`/api/trips/${tripId}/routes?from=${fromPlaceId}&to=${toPlaceId}`)
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setState("unavailable");
          setData(null);
        } else {
          setState("ready");
          setData(result);
        }
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [tripId, fromPlaceId, toPlaceId]);

  return (
    <div className="ml-7 flex items-center gap-x-3 gap-y-0.5 py-1.5 text-xs text-neutral-500">
      <span className="inline-flex items-center gap-1">
        🚗 자차{" "}
        {state === "loading" ? (
          "조회 중..."
        ) : state === "unavailable" ? (
          <span className="text-neutral-400">교통 API 키 설정 필요</span>
        ) : (
          `${Math.round(data!.durationSec / 60)}분 · ${(data!.distanceM / 1000).toFixed(1)}km`
        )}
      </span>
      {state === "ready" && data?.fareWon != null ? (
        <span className="inline-flex items-center gap-1">🚕 택시 {data.fareWon.toLocaleString()}원</span>
      ) : null}
    </div>
  );
}
