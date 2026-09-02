"use client";

import { useEffect, useState } from "react";

type Metrics = { distanceM: number; durationSec: number; fareWon: number | null };

export function RouteSegmentRow({
  tripId,
  fromPlaceId,
  toPlaceId,
  mode,
  onModeChange,
}: {
  tripId: string;
  fromPlaceId: string;
  toPlaceId: string;
  mode: "car" | "bus";
  onModeChange: (mode: "car" | "bus") => void;
}) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setUnavailable(false);

    fetch(`/api/trips/${tripId}/routes?from=${fromPlaceId}&to=${toPlaceId}&mode=${mode}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setUnavailable(true);
          setMetrics(null);
        } else {
          setMetrics(data);
        }
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tripId, fromPlaceId, toPlaceId, mode]);

  return (
    <div className="ml-7 flex items-center gap-2 py-1.5 text-xs text-neutral-500">
      <div className="flex rounded-full border border-neutral-200 bg-neutral-50 p-0.5">
        <button
          onClick={() => onModeChange("car")}
          className={`rounded-full px-2 py-0.5 ${mode === "car" ? "bg-blue-600 text-white" : "text-neutral-500"}`}
        >
          차
        </button>
        <button
          onClick={() => onModeChange("bus")}
          className={`rounded-full px-2 py-0.5 ${
            mode === "bus" ? "bg-orange-100 text-orange-700 ring-1 ring-orange-400" : "text-neutral-500"
          }`}
        >
          버스
        </button>
      </div>
      {loading ? (
        <span>조회 중...</span>
      ) : unavailable ? (
        <span className="text-neutral-400">교통 API 키 설정 필요</span>
      ) : metrics ? (
        <span>
          {Math.round(metrics.durationSec / 60)}분 · {(metrics.distanceM / 1000).toFixed(1)}km
          {metrics.fareWon != null ? ` · ${metrics.fareWon.toLocaleString()}원` : ""}
        </span>
      ) : null}
    </div>
  );
}
