"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type MapPoint = { id: string; name: string; lat: number; lng: number };
type MapSegment = {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  path?: { lat: number; lng: number }[];
};

declare global {
  interface Window {
    kakao: any;
  }
}

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

// 장소를 선택했을 때 확대할 레벨. 카카오맵 축척 표시가 "50m"로 뜨는 레벨.
const SELECTED_PLACE_ZOOM_LEVEL = 3;

export function KakaoMapCanvas({
  points,
  segments = [],
  selectedPlaceId,
}: {
  points: MapPoint[];
  segments?: MapSegment[];
  selectedPlaceId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const polylinesRef = useRef<any[]>([]);

  // 지도/마커/이동경로선 생성 (장소 목록이 바뀔 때만)
  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.kakao?.maps) return;

    window.kakao.maps.load(() => {
      const map = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 8,
      });
      mapRef.current = map;

      polylinesRef.current.forEach((line) => line.setMap(null));
      polylinesRef.current = [];
      markersRef.current.clear();

      if (points.length === 0) return;

      const bounds = new window.kakao.maps.LatLngBounds();
      points.forEach((point) => {
        const position = new window.kakao.maps.LatLng(point.lat, point.lng);
        const marker = new window.kakao.maps.Marker({ map, position, title: point.name });
        markersRef.current.set(point.id, marker);
        bounds.extend(position);
      });

      segments.forEach((segment) => {
        const path =
          segment.path && segment.path.length > 1
            ? segment.path.map((p) => new window.kakao.maps.LatLng(p.lat, p.lng))
            : [
                new window.kakao.maps.LatLng(segment.fromLat, segment.fromLng),
                new window.kakao.maps.LatLng(segment.toLat, segment.toLng),
              ];

        const polyline = new window.kakao.maps.Polyline({
          map,
          path,
          strokeWeight: 4,
          strokeColor: "#2F6FED",
          strokeOpacity: 0.8,
          strokeStyle: "solid",
        });
        polylinesRef.current.push(polyline);
      });

      map.setBounds(bounds);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, points, segments]);

  // 타임라인/비용/사진 탭에서 장소를 선택하면 지도만 이동+확대(마커·경로는 다시 안 그림)
  useEffect(() => {
    if (!selectedPlaceId || !mapRef.current) return;
    const marker = markersRef.current.get(selectedPlaceId);
    if (!marker) return;
    mapRef.current.setLevel(SELECTED_PLACE_ZOOM_LEVEL);
    mapRef.current.panTo(marker.getPosition());
  }, [selectedPlaceId]);

  if (!KAKAO_JS_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-center text-sm text-neutral-500">
        지도를 표시하려면 .env의 NEXT_PUBLIC_KAKAO_JS_KEY를 설정하세요.
        <br />
        (카카오 디벨로퍼스에서 새 키를 발급받아야 합니다 — 기존 키는 유출되어 폐기되었습니다)
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`}
        onLoad={() => setSdkReady(true)}
      />
      <div ref={containerRef} className="h-full w-full" />
    </>
  );
}
