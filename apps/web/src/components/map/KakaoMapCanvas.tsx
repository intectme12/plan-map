"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type MapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category?: string | null;
  address?: string | null;
  roadAddress?: string | null;
  phone?: string | null;
  placeUrl?: string | null;
};
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

function buildInfoCard(point: MapPoint, onClose: () => void): HTMLElement {
  const card = document.createElement("div");
  card.style.cssText =
    "position:relative; min-width:210px; max-width:270px; padding:10px 12px; background:#fff; border-radius:10px; box-shadow:0 4px 16px rgba(15,23,42,0.2); font-family:inherit; font-size:12px; color:#334155; line-height:1.5;";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.setAttribute("aria-label", "닫기");
  closeBtn.style.cssText =
    "position:absolute; top:6px; right:8px; border:none; background:transparent; color:#94a3b8; cursor:pointer; font-size:12px; line-height:1; padding:2px;";
  closeBtn.onclick = onClose;
  card.appendChild(closeBtn);

  const title = document.createElement("div");
  title.textContent = point.name;
  title.style.cssText = "font-weight:700; font-size:13px; padding-right:16px; margin-bottom:2px;";
  card.appendChild(title);

  if (point.category) {
    const cat = document.createElement("div");
    cat.textContent = point.category;
    cat.style.cssText = "color:#64748b; font-size:11px; margin-bottom:4px;";
    card.appendChild(cat);
  }

  if (point.address) {
    const addr = document.createElement("div");
    addr.textContent = `지번 ${point.address}`;
    addr.style.cssText = "margin-bottom:1px;";
    card.appendChild(addr);
  }

  if (point.roadAddress) {
    const road = document.createElement("div");
    road.textContent = `도로명 ${point.roadAddress}`;
    road.style.cssText = "color:#64748b; margin-bottom:2px;";
    card.appendChild(road);
  }

  if (point.phone) {
    const phone = document.createElement("a");
    phone.href = `tel:${point.phone}`;
    phone.textContent = point.phone;
    phone.style.cssText = "display:block; color:#2563eb; text-decoration:none; margin-bottom:4px;";
    card.appendChild(phone);
  }

  const links = document.createElement("div");
  links.style.cssText = "display:flex; gap:10px; margin-top:6px; padding-top:6px; border-top:1px solid #e2e8f0;";

  if (point.placeUrl) {
    const kakaoLink = document.createElement("a");
    kakaoLink.href = point.placeUrl;
    kakaoLink.target = "_blank";
    kakaoLink.rel = "noopener noreferrer";
    kakaoLink.textContent = "카카오맵에서 보기";
    kakaoLink.style.cssText = "color:#b45309; font-weight:600; text-decoration:none; font-size:11px;";
    links.appendChild(kakaoLink);
  }

  const naverLink = document.createElement("a");
  naverLink.href = `https://map.naver.com/v5/search/${encodeURIComponent(point.name)}`;
  naverLink.target = "_blank";
  naverLink.rel = "noopener noreferrer";
  naverLink.textContent = "네이버 지도";
  naverLink.style.cssText = "color:#15803d; font-weight:600; text-decoration:none; font-size:11px;";
  links.appendChild(naverLink);

  card.appendChild(links);

  return card;
}

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
  const pointsRef = useRef<Map<string, MapPoint>>(new Map());
  const polylinesRef = useRef<any[]>([]);
  const infoOverlayRef = useRef<any>(null);

  // 마커 클릭과 대시보드(타임라인/비용/사진) 클릭 양쪽에서 공유하는 정보 카드 열기 함수.
  // effect 밖의 함수로 둬서 selectedPlaceId 변경 시에도 그대로 재사용한다.
  function openInfoOverlay(pointId: string) {
    const map = mapRef.current;
    const marker = markersRef.current.get(pointId);
    const point = pointsRef.current.get(pointId);
    if (!map || !marker || !point) return;

    infoOverlayRef.current?.setMap(null);

    const overlay = new window.kakao.maps.CustomOverlay({
      position: marker.getPosition(),
      content: buildInfoCard(point, () => overlay.setMap(null)),
      xAnchor: 0.5,
      yAnchor: 1.35,
      zIndex: 10,
    });
    overlay.setMap(map);
    infoOverlayRef.current = overlay;
  }

  // 다른 화면(AI 가져오기 등)에서 이미 SDK를 로드해놓고 돌아온 경우, next/script의
  // onLoad는 다시 안 불려서(onReady만 불림) sdkReady가 영영 안 켜질 수 있음 — 안전망으로 직접 확인.
  useEffect(() => {
    if (window.kakao?.maps) setSdkReady(true);
  }, []);

  // 지도/마커/이동경로선 생성 (장소 목록이 바뀔 때만)
  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.kakao?.maps) return;

    window.kakao.maps.load(() => {
      const map = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 8,
      });
      mapRef.current = map;

      window.kakao.maps.event.addListener(map, "click", () => {
        infoOverlayRef.current?.setMap(null);
      });

      polylinesRef.current.forEach((line) => line.setMap(null));
      polylinesRef.current = [];
      markersRef.current.clear();
      pointsRef.current.clear();

      if (points.length === 0) return;

      const bounds = new window.kakao.maps.LatLngBounds();
      points.forEach((point) => {
        const position = new window.kakao.maps.LatLng(point.lat, point.lng);
        const marker = new window.kakao.maps.Marker({ map, position, title: point.name });
        markersRef.current.set(point.id, marker);
        pointsRef.current.set(point.id, point);
        bounds.extend(position);

        window.kakao.maps.event.addListener(marker, "click", () => openInfoOverlay(point.id));
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

  // 타임라인/비용/사진 탭에서 장소를 선택하면 지도를 이동+확대하고, 그 장소의 정보 카드도 띄운다.
  useEffect(() => {
    if (!selectedPlaceId || !mapRef.current) return;
    const marker = markersRef.current.get(selectedPlaceId);
    if (!marker) return;
    mapRef.current.setLevel(SELECTED_PLACE_ZOOM_LEVEL);
    mapRef.current.panTo(marker.getPosition());
    openInfoOverlay(selectedPlaceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        onReady={() => setSdkReady(true)}
      />
      <div ref={containerRef} className="h-full w-full" />
    </>
  );
}
