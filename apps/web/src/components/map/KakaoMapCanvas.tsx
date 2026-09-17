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
  rating?: number;
  reviewCount?: number;
  // 아래 3개는 트립 상세(타임라인) 화면에서만 채워서 넘긴다 — 없으면 기존과 동일한
  // 기본 핀 마커/정보창을 그대로 쓰므로 다른 화면(홈 지도 위젯 등)은 영향 없음.
  label?: number;
  markerColor?: string;
  photoUrl?: string | null;
  costWon?: number;
};
type MapSegment = {
  id?: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  path?: { lat: number; lng: number }[];
  color?: string;
  durationSec?: number;
  distanceM?: number;
};

declare global {
  interface Window {
    kakao: any;
  }
}

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

// 장소를 선택했을 때 확대할 레벨. 카카오맵 축척 표시가 "100m"로 뜨는 레벨.
const SELECTED_PLACE_ZOOM_LEVEL = 4;
const SELECTED_ROUTE_COLOR = "#FACC15"; // 경로 라벨을 클릭했을 때 구분하기 쉽도록 노란색으로 강조

function segmentKey(segment: MapSegment, index: number) {
  return segment.id ?? `seg-${index}`;
}

function formatDuration(sec: number) {
  const min = Math.round(sec / 60);
  return min < 60 ? `${min}분` : `${Math.floor(min / 60)}시간 ${min % 60}분`;
}

function formatDistance(m: number) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function buildInfoCard(point: MapPoint, onClose: () => void, onOpenReviews?: (placeId: string) => void): HTMLElement {
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

  if (point.photoUrl) {
    const photo = document.createElement("img");
    photo.src = point.photoUrl;
    photo.alt = "";
    photo.style.cssText =
      "display:block; width:100%; height:100px; object-fit:cover; border-radius:8px; margin-bottom:6px;";
    card.appendChild(photo);
  }

  const titleRow = document.createElement("div");
  titleRow.style.cssText =
    "display:flex; align-items:center; gap:5px; padding-right:16px; margin-bottom:2px;";

  const title = document.createElement("span");
  title.textContent = point.name;
  title.style.cssText = "font-weight:700; font-size:13px;";
  titleRow.appendChild(title);

  if (point.rating && point.rating > 0) {
    const ratingBadge = document.createElement("span");
    ratingBadge.style.cssText =
      "display:inline-flex; align-items:center; gap:2px; color:#b45309; font-weight:600; font-size:12px; flex:none;";
    ratingBadge.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z" fill="#facc15" stroke="#facc15" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    const ratingValue = document.createElement("span");
    ratingValue.textContent = point.rating.toFixed(1);
    ratingBadge.appendChild(ratingValue);
    titleRow.appendChild(ratingBadge);
  }

  if (point.reviewCount && point.reviewCount > 0 && onOpenReviews) {
    const reviewBtn = document.createElement("button");
    reviewBtn.type = "button";
    reviewBtn.textContent = `후기 ${point.reviewCount}개`;
    reviewBtn.style.cssText =
      "color:#2563eb; font-weight:600; font-size:11px; background:transparent; border:none; padding:0; cursor:pointer; text-decoration:underline; flex:none;";
    reviewBtn.onclick = () => {
      // kakao.maps.event.preventMap()는 인자를 받는 함수가 아니라, 호출된 시점부터 다음
      // tick까지만 지도의 클릭/드래그 처리를 잠깐 억제하는 전역 플래그다(카드를 만들 때
      // 한 번 호출해두는 식으로는 효과가 없음 — 실제로 클릭이 일어나는 이 핸들러 안에서
      // 매번 호출해야, 이 클릭이 버블링돼 지도의 "빈 곳 클릭 시 정보창 닫기" 리스너까지
      // 전파되는 걸 막을 수 있다).
      window.kakao.maps.event.preventMap();
      onOpenReviews(point.id);
    };
    titleRow.appendChild(reviewBtn);
  }

  card.appendChild(titleRow);

  if (point.category) {
    const cat = document.createElement("div");
    cat.textContent = point.category;
    cat.style.cssText = "color:#64748b; font-size:11px; margin-bottom:4px;";
    card.appendChild(cat);
  }

  if (point.costWon && point.costWon > 0) {
    const cost = document.createElement("div");
    cost.textContent = `💰 ${point.costWon.toLocaleString()}원`;
    cost.style.cssText = "color:#b45309; font-weight:600; margin-bottom:4px;";
    card.appendChild(cost);
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

// 번호가 매겨진 장소(트립 상세 타임라인)만 파란 원+흰 숫자 커스텀 마커를 쓰고, 번호가 없는
// 호출부(홈 지도 위젯 등)는 이 함수 자체를 안 타서 기존 기본 핀 마커 그대로 나온다.
function buildNumberedMarkerImage(label: number, color: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">` +
    `<circle cx="15" cy="15" r="13" fill="${color}" stroke="white" stroke-width="2"/>` +
    `<text x="15" y="20" font-size="13" font-weight="700" fill="white" text-anchor="middle" font-family="sans-serif">${label}</text>` +
    `</svg>`;
  return new window.kakao.maps.MarkerImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    new window.kakao.maps.Size(30, 30),
    { offset: new window.kakao.maps.Point(15, 15) }
  );
}

function buildRouteLabelContent(segment: MapSegment, selected: boolean): HTMLElement {
  const label = document.createElement("button");
  label.type = "button";
  const parts: string[] = ["🚗"];
  if (segment.durationSec != null) parts.push(formatDuration(segment.durationSec));
  if (segment.distanceM != null) parts.push(formatDistance(segment.distanceM));
  label.textContent = parts.join(" · ");
  label.style.cssText = `border:none; border-radius:999px; padding:4px 9px; font-size:11px; font-weight:600; white-space:nowrap; cursor:pointer; box-shadow:0 2px 8px rgba(15,23,42,0.25); background:${
    selected ? SELECTED_ROUTE_COLOR : "#ffffff"
  }; color:${selected ? "#78350f" : "#334155"};`;
  return label;
}

export function KakaoMapCanvas({
  points,
  segments = [],
  selectedPlaceId,
  selectedSegmentId,
  onOpenReviews,
  onSelectSegment,
}: {
  points: MapPoint[];
  segments?: MapSegment[];
  selectedPlaceId?: string | null;
  selectedSegmentId?: string | null;
  onOpenReviews?: (placeId: string) => void;
  onSelectSegment?: (segmentId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const pointsRef = useRef<Map<string, MapPoint>>(new Map());
  const polylinesRef = useRef<Map<string, any>>(new Map());
  const routeLabelsRef = useRef<Map<string, any>>(new Map());
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
      content: buildInfoCard(point, () => overlay.setMap(null), onOpenReviews),
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

  // 지도/마커/이동경로선 생성 (장소 목록·이동경로가 바뀔 때마다 다시 만듦).
  // 기존 지도 위에서 마커/선만 갈아끼우는 방식은, 직전 폴리라인을 지우고(setMap(null))
  // 새로 만드는 두 호출이 카카오맵 내부 렌더링과 겹치면 옛 직선 경로가 화면에 남는 경우가
  // 있어서(카카오맵 SDK 자체의 폴리라인 교체 타이밍 이슈로 추정), 매번 컨테이너를 비우고
  // 지도를 통째로 새로 만드는 더 단순하고 안전한 방식으로 되돌림.
  // (경로 선택 강조는 여기서 다시 만들지 않고 아래 별도 effect에서 색만 바꾼다 — 클릭할
  // 때마다 지도 전체가 리셋되며 확대/이동 상태가 튀는 것을 막기 위함.)
  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.kakao?.maps) return;

    let torndown = false;

    window.kakao.maps.load(() => {
      // React StrictMode(dev)는 effect를 마운트→클린업→재마운트로 두 번 실행하는데,
      // cleanup 없이 그대로 두면 이전 인스턴스의 Map이 같은 컨테이너에 남아 있다가
      // 나중에 만들어진(올바른) 지도 위/아래에 겹쳐서 옛 상태로 보일 수 있음.
      if (torndown || !containerRef.current) return;

      containerRef.current.innerHTML = "";
      const map = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 8,
      });
      mapRef.current = map;

      window.kakao.maps.event.addListener(map, "click", () => {
        infoOverlayRef.current?.setMap(null);
      });

      markersRef.current.clear();
      pointsRef.current.clear();
      polylinesRef.current.clear();
      routeLabelsRef.current.clear();

      if (points.length > 0) {
        const bounds = new window.kakao.maps.LatLngBounds();
        points.forEach((point) => {
          const position = new window.kakao.maps.LatLng(point.lat, point.lng);
          const marker = new window.kakao.maps.Marker({
            map,
            position,
            title: point.name,
            image: point.label != null ? buildNumberedMarkerImage(point.label, point.markerColor ?? "#2563EB") : undefined,
          });
          markersRef.current.set(point.id, marker);
          pointsRef.current.set(point.id, point);
          bounds.extend(position);

          window.kakao.maps.event.addListener(marker, "click", () => openInfoOverlay(point.id));
        });

        segments.forEach((segment, index) => {
          // 실제 도로 경로가 로딩되기 전에는 출발-도착을 잇는 직선으로 대체 표시하지 않고,
          // path가 준비된 뒤에만 선을 그린다.
          if (!segment.path || segment.path.length < 2) return;
          const key = segmentKey(segment, index);
          const path = segment.path.map((p) => new window.kakao.maps.LatLng(p.lat, p.lng));

          const polyline = new window.kakao.maps.Polyline({
            map,
            path,
            strokeWeight: 5,
            strokeColor: key === selectedSegmentId ? SELECTED_ROUTE_COLOR : segment.color ?? "#2F6FED",
            strokeOpacity: 0.85,
            strokeStyle: "solid",
          });
          polylinesRef.current.set(key, polyline);

          if ((segment.durationSec != null || segment.distanceM != null) && onSelectSegment) {
            const midpoint = path[Math.floor(path.length / 2)];
            const overlay = new window.kakao.maps.CustomOverlay({
              position: midpoint,
              content: buildRouteLabelContent(segment, key === selectedSegmentId),
              xAnchor: 0.5,
              yAnchor: 0.5,
              zIndex: 5,
            });
            overlay.setMap(map);
            // CustomOverlay의 content는 매번 새로 만든 DOM 노드라 여기서 바로 클릭 리스너를
            // 붙이면 된다 — preventMap()은 실제 클릭이 일어나는 이 핸들러 안에서 호출해야
            // 지도의 "빈 곳 클릭 시 닫기" 리스너로 전파되는 걸 막을 수 있다(위 후기버튼과 동일 원리).
            const content = overlay.getContent();
            const buttonEl = content instanceof HTMLElement ? content : null;
            buttonEl?.addEventListener("click", () => {
              window.kakao.maps.event.preventMap();
              onSelectSegment(key);
            });
            routeLabelsRef.current.set(key, overlay);
          }
        });

        // 컨테이너가 아직 레이아웃/페인트되기 전에 Map을 생성하면 좌표 투영이 (0,0)
        // 기준으로 깨진 채 굳어버리는 카카오맵 고질적 이슈 — 다음 프레임까지 미뤄서
        // 실제 크기가 잡힌 뒤에 relayout+범위 맞춤이 이뤄지도록 함.
        requestAnimationFrame(() => {
          if (torndown) return;
          map.relayout();
          map.setBounds(bounds);
        });
      }
    });

    return () => {
      torndown = true;
      mapRef.current = null;
      markersRef.current.clear();
      pointsRef.current.clear();
      polylinesRef.current.clear();
      routeLabelsRef.current.clear();
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
    // selectedSegmentId는 아래 별도 effect가 다시 그리지 않고 색만 바꾸므로 일부러 뺐다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, points, segments]);

  // 경로 라벨을 클릭해 선택이 바뀌면, 지도를 통째로 다시 만들지 않고 폴리라인 색과
  // 라벨 배경색만 바꾼다 — 그래야 클릭할 때마다 지도 확대/이동 상태가 리셋되지 않는다.
  useEffect(() => {
    segments.forEach((segment, index) => {
      const key = segmentKey(segment, index);
      const selected = key === selectedSegmentId;

      const polyline = polylinesRef.current.get(key);
      polyline?.setOptions({ strokeColor: selected ? SELECTED_ROUTE_COLOR : segment.color ?? "#2F6FED" });

      const overlay = routeLabelsRef.current.get(key);
      if (overlay) {
        const newContent = buildRouteLabelContent(segment, selected);
        newContent.addEventListener("click", () => {
          window.kakao.maps.event.preventMap();
          onSelectSegment?.(key);
        });
        overlay.setContent(newContent);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSegmentId]);

  // 타임라인/비용/사진 탭에서 장소를 선택하면 지도를 이동+확대하고, 그 장소의 정보 카드도 띄운다.
  useEffect(() => {
    if (!selectedPlaceId || !mapRef.current) return;
    const marker = markersRef.current.get(selectedPlaceId);
    if (!marker) return;
    mapRef.current.setLevel(SELECTED_PLACE_ZOOM_LEVEL);
    mapRef.current.panTo(marker.getPosition());
    openInfoOverlay(selectedPlaceId);
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
