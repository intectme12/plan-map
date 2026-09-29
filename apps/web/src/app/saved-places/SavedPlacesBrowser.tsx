"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronDown, Image as ImageIcon, List, Map as MapIcon, MapPin, RotateCcw, Search, Wallet } from "lucide-react";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";

type PlaceItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  roadAddress: string | null;
  category: string | null;
  scheduledAt: string | null;
  createdAt: string;
  tripId: string;
  tripName: string;
  photoUrl: string | null;
  photoCount: number;
  expenseTotal: number;
};

type SortKey = "recent" | "name" | "schedule";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "최근 추가순" },
  { value: "name", label: "이름순" },
  { value: "schedule", label: "일정순" },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const UNCATEGORIZED = "기타";

// 장소 카테고리는 카카오 원본("음식점 > 한식 > 국밥")과 짧은 값("카페")이 섞여 있어서,
// 필터는 맨 앞 분류로 묶고 목록에는 맨 끝 분류만 짧게 보여준다(데이터 자체는 건드리지 않음).
function topCategory(category: string | null) {
  return category?.split(">")[0].trim() || UNCATEGORIZED;
}
function shortCategory(category: string | null) {
  return category ? category.split(">").at(-1)!.trim() : null;
}

function formatSchedule(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function sortPlaces(places: PlaceItem[], sort: SortKey) {
  const copy = [...places];
  if (sort === "name") copy.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  else if (sort === "schedule")
    copy.sort((a, b) => {
      // 일정이 없는 장소는 뒤로
      if (!a.scheduledAt) return b.scheduledAt ? 1 : 0;
      if (!b.scheduledAt) return -1;
      return a.scheduledAt.localeCompare(b.scheduledAt);
    });
  else copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return copy;
}

// 지도(왼쪽)와 트립별 장소 목록(오른쪽)이 같은 장소 id로 선택 상태를 공유한다 —
// 목록 클릭 → 지도 이동/정보카드/마커 강조, 마커 클릭 → 목록 강조+스크롤+상세 펼침.
// 트립 선택·검색·카테고리 필터는 지도와 목록에 똑같이 적용된다.
export function SavedPlacesBrowser({ places }: { places: PlaceItem[] }) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of places) counts.set(topCategory(p.category), (counts.get(topCategory(p.category)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [places]);

  // 검색·카테고리까지 거른 목록(트립 선택 전) — 트립 그룹 헤더는 여기서 만들어야 다른 트립으로 바로 전환할 수 있다
  const searched = useMemo(() => {
    const term = query.trim().toLowerCase();
    return places.filter((p) => {
      if (category && topCategory(p.category) !== category) return false;
      if (!term) return true;
      return [p.name, p.address, p.roadAddress].some((v) => v?.toLowerCase().includes(term));
    });
  }, [places, query, category]);

  const visible = useMemo(
    () => (selectedTripId ? searched.filter((p) => p.tripId === selectedTripId) : searched),
    [searched, selectedTripId]
  );

  const tripGroups = useMemo(() => {
    const map = new Map<string, { tripId: string; tripName: string; places: PlaceItem[] }>();
    for (const place of sortPlaces(searched, sort)) {
      const group = map.get(place.tripId);
      if (group) group.places.push(place);
      else map.set(place.tripId, { tripId: place.tripId, tripName: place.tripName, places: [place] });
    }
    return [...map.values()];
  }, [searched, sort]);

  // 필터로 선택한 장소가 사라지면 선택도 없는 것으로 본다(별도 effect로 지우지 않고 렌더 시점에 계산)
  const activePlaceId = selectedPlaceId && visible.some((p) => p.id === selectedPlaceId) ? selectedPlaceId : null;

  // KakaoMapCanvas는 points가 바뀔 때마다 지도를 다시 만들고 setBounds로 자동
  // 리센터/줌까지 해주므로, 필터링된 배열만 새로 넘기면 카메라 제어를 따로 안 해도 된다.
  const mapPoints = useMemo(
    () =>
      visible.map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        category: `${p.tripName}${p.category ? ` · ${shortCategory(p.category)}` : ""}`,
        address: p.address,
        roadAddress: p.roadAddress,
        photoUrl: p.photoUrl,
        costWon: p.expenseTotal || undefined,
      })),
    [visible]
  );

  // 마커로 선택하면 목록에서 그 항목이 보이도록 스크롤
  useEffect(() => {
    if (!activePlaceId) return;
    itemRefs.current.get(activePlaceId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activePlaceId]);

  const filtersActive = Boolean(selectedTripId || query.trim() || category);
  function resetFilters() {
    setSelectedTripId(null);
    setQuery("");
    setCategory(null);
  }

  const chip = (active: boolean) =>
    `flex h-8 flex-none items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors ${
      active
        ? "border-blue-300 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
    }`;

  return (
    <div className="mt-5 flex flex-col gap-3 lg:min-h-0 lg:flex-1">
      {/* 검색 · 카테고리 · 초기화 */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative lg:w-72 lg:flex-none">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장소명 또는 주소 검색"
            aria-label="장소명 또는 주소 검색"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15"
          />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {categoryOptions.length > 1 ? (
            <div role="group" aria-label="카테고리 필터" className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-0.5">
              <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)} className={chip(category === null)}>
                전체
              </button>
              {categoryOptions.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={category === c.name}
                  onClick={() => setCategory((prev) => (prev === c.name ? null : c.name))}
                  className={chip(category === c.name)}
                >
                  {c.name}
                  <span className={category === c.name ? "text-blue-500" : "text-slate-400"}>{c.count}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1" />
          )}
          {filtersActive ? (
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-8 flex-none items-center gap-1 rounded-full px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 필터 초기화
            </button>
          ) : null}
        </div>
      </div>

      {/* 모바일: 지도/목록 전환(둘이 동시에 좁아지지 않도록) */}
      <div role="tablist" aria-label="보기 전환" className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 lg:hidden">
        {(
          [
            { value: "map", label: "지도", icon: <MapIcon className="h-4 w-4" /> },
            { value: "list", label: `목록 ${visible.length}`, icon: <List className="h-4 w-4" /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={mobileView === tab.value}
            onClick={() => setMobileView(tab.value)}
            className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
              mobileView === tab.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_360px]">
        <div
          className={`h-[60vh] min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 lg:block lg:h-full lg:min-h-0 ${
            mobileView === "map" ? "block" : "hidden"
          }`}
        >
          {/* 모바일에서 숨겨져 있던(display:none) 지도는 크기가 0으로 굳어 깨지므로, 탭을 바꾸면 새로 만든다
              (데스크톱은 탭이 숨겨져 mobileView가 안 바뀌어 영향 없음) */}
          <KakaoMapCanvas
            key={mobileView}
            points={mapPoints}
            selectedPlaceId={activePlaceId}
            onSelectPoint={setSelectedPlaceId}
            highlightSelected
          />
        </div>

        <section
          aria-label="내 장소"
          className={`flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:flex lg:h-full lg:min-h-0 ${
            mobileView === "list" ? "flex" : "hidden"
          }`}
        >
          <div className="flex flex-none items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-900">
              내 장소 <span className="font-semibold text-slate-400">{visible.length}곳</span>
            </h2>
            <label className="relative">
              <span className="sr-only">정렬</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-8 appearance-none rounded-lg border border-slate-200 bg-white pr-7 pl-2.5 text-xs font-medium text-slate-600 outline-none focus:border-blue-600"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </label>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            <button
              type="button"
              onClick={() => setSelectedTripId(null)}
              className={`flex flex-none items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                selectedTripId === null
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              전체 여행
              <span className={`text-xs font-medium ${selectedTripId === null ? "text-blue-500" : "text-slate-400"}`}>
                {searched.length}곳
              </span>
            </button>

            {tripGroups.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">조건에 맞는 장소가 없어요.</p>
            ) : null}

            {tripGroups.map((group) => {
              const active = selectedTripId === group.tripId;
              const expanded = selectedTripId === null || active;
              return (
                <div
                  key={group.tripId}
                  className={`flex-none overflow-hidden rounded-xl border ${active ? "border-blue-200" : "border-slate-200"}`}
                >
                  <div className={`flex items-center gap-1 px-3.5 py-2.5 ${active ? "bg-blue-50/60" : "bg-slate-50/60"}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedTripId(active ? null : group.tripId)}
                      aria-expanded={expanded}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <ChevronDown
                        className={`h-4 w-4 flex-none text-slate-400 transition-transform ${expanded ? "" : "-rotate-90"}`}
                      />
                      <span className={`truncate text-sm font-semibold ${active ? "text-blue-700" : "text-slate-900"}`}>
                        {group.tripName}
                      </span>
                      <span className={`flex-none text-xs ${active ? "text-blue-500" : "text-slate-400"}`}>
                        · {group.places.length}곳
                      </span>
                    </button>
                    <Link
                      href={`/trips/${group.tripId}`}
                      aria-label={`${group.tripName} 여행 페이지로 이동`}
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>

                  {expanded ? (
                    <ul>
                      {group.places.map((place) => {
                        const selected = place.id === activePlaceId;
                        const cat = shortCategory(place.category);
                        const address = place.roadAddress ?? place.address;
                        return (
                          <li
                            key={place.id}
                            ref={(el) => {
                              if (el) itemRefs.current.set(place.id, el);
                              else itemRefs.current.delete(place.id);
                            }}
                            className={`border-t border-slate-100 ${selected ? "bg-blue-50 shadow-[inset_3px_0_0_#2563EB]" : ""}`}
                          >
                            <button
                              type="button"
                              aria-expanded={selected}
                              onClick={() => setSelectedPlaceId(selected ? null : place.id)}
                              className={`flex min-h-16 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                                selected ? "" : "hover:bg-slate-50"
                              }`}
                            >
                              {place.photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={place.photoUrl} alt="" className="h-11 w-11 flex-none rounded-lg object-cover" />
                              ) : (
                                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                  <MapPin className="h-4 w-4" />
                                </span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  <span className={`truncate text-sm font-semibold ${selected ? "text-blue-700" : "text-slate-900"}`}>
                                    {place.name}
                                  </span>
                                  {cat ? (
                                    <span className="flex-none rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                                      {cat}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500">
                                  {place.scheduledAt ? (
                                    <span className="font-medium text-blue-600">{formatSchedule(place.scheduledAt)} · </span>
                                  ) : null}
                                  {address ?? "주소 정보 없음"}
                                </span>
                              </span>
                            </button>

                            {selected ? (
                              <div className="px-3.5 pb-3">
                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-lg bg-white px-3 py-2.5 text-xs">
                                  {place.roadAddress ? (
                                    <>
                                      <dt className="text-slate-400">도로명</dt>
                                      <dd className="text-slate-700">{place.roadAddress}</dd>
                                    </>
                                  ) : null}
                                  {place.address ? (
                                    <>
                                      <dt className="text-slate-400">지번</dt>
                                      <dd className="text-slate-700">{place.address}</dd>
                                    </>
                                  ) : null}
                                  {place.category ? (
                                    <>
                                      <dt className="text-slate-400">카테고리</dt>
                                      <dd className="text-slate-700">{place.category}</dd>
                                    </>
                                  ) : null}
                                  <dt className="text-slate-400">여행</dt>
                                  <dd className="text-slate-700">{place.tripName}</dd>
                                  <dt className="text-slate-400">
                                    <CalendarDays className="inline h-3 w-3" /> 일정
                                  </dt>
                                  <dd className="text-slate-700">
                                    {place.scheduledAt ? formatSchedule(place.scheduledAt) : "날짜 미정"}
                                  </dd>
                                  {place.expenseTotal > 0 ? (
                                    <>
                                      <dt className="text-slate-400">
                                        <Wallet className="inline h-3 w-3" /> 지출
                                      </dt>
                                      <dd className="text-slate-700">{place.expenseTotal.toLocaleString()}원</dd>
                                    </>
                                  ) : null}
                                  {place.photoCount > 0 ? (
                                    <>
                                      <dt className="text-slate-400">
                                        <ImageIcon className="inline h-3 w-3" /> 사진
                                      </dt>
                                      <dd className="text-slate-700">{place.photoCount}장</dd>
                                    </>
                                  ) : null}
                                  <dt className="text-slate-400">추가한 날</dt>
                                  <dd className="text-slate-700">{formatDate(place.createdAt)}</dd>
                                </dl>
                                <div className="mt-2 flex gap-2">
                                  <Link
                                    href={`/trips/${place.tripId}`}
                                    className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    여행에서 보기 <ArrowUpRight className="h-3.5 w-3.5" />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => setMobileView("map")}
                                    className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 lg:hidden"
                                  >
                                    <MapIcon className="h-3.5 w-3.5" /> 지도에서 보기
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
