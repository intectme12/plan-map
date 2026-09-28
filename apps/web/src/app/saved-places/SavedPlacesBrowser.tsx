"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";

type PlaceItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  roadAddress: string | null;
  tripId: string;
  tripName: string;
};

// 오른쪽 "전체" pill(선택 시 모든 트립이 함께 펼쳐짐) + 트립별 아코디언 행, 왼쪽 지도가
// 선택된 트립 하나로(또는 "전체"면 전체로) 같이 필터링되는 걸 한 컴포넌트가 함께 관리한다 —
// 지도가 클라이언트 컴포넌트(KakaoMapCanvas)라 이 상호작용 자체도 클라이언트에서 해야 한다.
export function SavedPlacesBrowser({ places }: { places: PlaceItem[] }) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const tripGroups = useMemo(() => {
    const map = new Map<string, { tripId: string; tripName: string; places: PlaceItem[] }>();
    for (const place of places) {
      const group = map.get(place.tripId);
      if (group) group.places.push(place);
      else map.set(place.tripId, { tripId: place.tripId, tripName: place.tripName, places: [place] });
    }
    return [...map.values()];
  }, [places]);

  // KakaoMapCanvas는 points가 바뀔 때마다 지도를 다시 만들고 setBounds로 자동
  // 리센터/줌까지 해주므로, 필터링된 배열만 새로 넘기면 카메라 제어를 따로 안 해도 된다.
  const mapPoints = useMemo(() => {
    const filtered = selectedTripId ? places.filter((p) => p.tripId === selectedTripId) : places;
    return filtered.map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      category: p.tripName,
      address: p.address ?? p.roadAddress ?? undefined,
    }));
  }, [places, selectedTripId]);

  return (
    <div className="mt-6 grid grid-cols-1 gap-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_360px]">
      <div className="h-[420px] overflow-hidden rounded-2xl border border-neutral-100 shadow-[0_2px_12px_rgba(15,23,42,0.06)] lg:h-full lg:min-h-0">
        <KakaoMapCanvas points={mapPoints} />
      </div>

      <div className="flex flex-col gap-2 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        <button
          type="button"
          onClick={() => setSelectedTripId(null)}
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
            selectedTripId === null
              ? "border-blue-200 bg-blue-50 text-blue-600"
              : "border-neutral-100 bg-white text-neutral-900 hover:bg-neutral-50"
          }`}
        >
          전체
          <span className={selectedTripId === null ? "text-xs font-medium text-blue-500" : "text-xs font-medium text-neutral-400"}>
            {places.length}곳
          </span>
        </button>

        {tripGroups.map((group) => {
          const active = selectedTripId === group.tripId;
          const expanded = selectedTripId === null || active;
          return (
            <div
              key={group.tripId}
              className={`rounded-2xl border p-4 transition-colors ${
                active ? "border-blue-200 bg-blue-50/40" : "border-neutral-100 bg-white"
              }`}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedTripId(group.tripId)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                >
                  <span className={`truncate text-sm font-semibold ${active ? "text-blue-600" : "text-neutral-900"}`}>
                    {group.tripName}
                  </span>
                  <span className={`flex-none text-xs font-medium ${active ? "text-blue-500" : "text-neutral-400"}`}>
                    {group.places.length}곳
                  </span>
                </button>
                <Link
                  href={`/trips/${group.tripId}`}
                  aria-label={`${group.tripName} 여행 페이지로 이동`}
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              {expanded ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {group.places.map((place) => (
                    <li key={place.id} className="flex items-start gap-2 text-xs text-neutral-600">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-neutral-400" />
                      <span className="min-w-0">
                        <span className="block font-medium text-neutral-800">{place.name}</span>
                        {place.address || place.roadAddress ? (
                          <span className="block truncate text-neutral-400">
                            {place.address ?? place.roadAddress}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
