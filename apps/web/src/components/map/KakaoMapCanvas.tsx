"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type MapPoint = { id: string; name: string; lat: number; lng: number };

declare global {
  interface Window {
    kakao: any;
  }
}

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

export function KakaoMapCanvas({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.kakao?.maps) return;

    window.kakao.maps.load(() => {
      const map = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 8,
      });

      if (points.length === 0) return;

      const bounds = new window.kakao.maps.LatLngBounds();
      points.forEach((point) => {
        const position = new window.kakao.maps.LatLng(point.lat, point.lng);
        new window.kakao.maps.Marker({ map, position, title: point.name });
        bounds.extend(position);
      });
      map.setBounds(bounds);
    });
  }, [sdkReady, points]);

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
