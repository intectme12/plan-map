"use client";

import { useEffect, useState } from "react";

type TransitLeg = {
  mode: "subway" | "bus" | "walk";
  label: string;
  from?: string;
  to?: string;
  stationCount?: number;
};

type RouteData = {
  distanceM: number;
  durationSec: number;
  fareWon: number | null;
  detail?: TransitLeg[] | null;
};

type FetchState = "loading" | "unavailable" | "ready";

function useRoute(tripId: string, fromPlaceId: string, toPlaceId: string, mode: "car" | "bus") {
  const [state, setState] = useState<FetchState>("loading");
  const [data, setData] = useState<RouteData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    fetch(`/api/trips/${tripId}/routes?from=${fromPlaceId}&to=${toPlaceId}&mode=${mode}`)
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
  }, [tripId, fromPlaceId, toPlaceId, mode]);

  return { state, data };
}

function legIcon(mode: TransitLeg["mode"]) {
  if (mode === "subway") return "🚇";
  if (mode === "bus") return "🚌";
  return "🚶";
}

export function RouteSegmentRow({
  tripId,
  fromPlaceId,
  toPlaceId,
}: {
  tripId: string;
  fromPlaceId: string;
  toPlaceId: string;
}) {
  const car = useRoute(tripId, fromPlaceId, toPlaceId, "car");
  const bus = useRoute(tripId, fromPlaceId, toPlaceId, "bus");

  const legs = bus.data?.detail?.filter((leg) => leg.mode !== "walk" || leg.label) ?? [];

  return (
    <div className="ml-7 flex flex-col gap-1 py-1.5 text-xs text-neutral-500">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="inline-flex items-center gap-1">
          🚗 자차{" "}
          {car.state === "loading"
            ? "조회 중..."
            : car.state === "unavailable"
              ? <span className="text-neutral-400">교통 API 키 설정 필요</span>
              : `${Math.round(car.data!.durationSec / 60)}분 · ${(car.data!.distanceM / 1000).toFixed(1)}km`}
        </span>
        {car.state === "ready" && car.data?.fareWon != null ? (
          <span className="inline-flex items-center gap-1">
            🚕 택시 {car.data.fareWon.toLocaleString()}원
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="inline-flex items-center gap-1">
          🚌 대중교통{" "}
          {bus.state === "loading"
            ? "조회 중..."
            : bus.state === "unavailable"
              ? <span className="text-neutral-400">교통 API 키 설정 필요</span>
              : `${Math.round(bus.data!.durationSec / 60)}분 · ${(bus.data!.distanceM / 1000).toFixed(1)}km`}
        </span>
        {bus.state === "ready" && bus.data?.fareWon != null ? <span>{bus.data.fareWon.toLocaleString()}원</span> : null}
      </div>

      {legs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 pl-4 text-[11px] text-neutral-400">
          {legs.map((leg, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 ? <span className="text-neutral-300">→</span> : null}
              <span>
                {legIcon(leg.mode)} {leg.label}
                {leg.from && leg.to ? ` (${leg.from}→${leg.to}${leg.stationCount ? ` ${leg.stationCount}개역` : ""})` : ""}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
