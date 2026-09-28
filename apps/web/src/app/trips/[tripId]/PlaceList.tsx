"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Camera, ArrowRightLeft, Plus } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RouteSegmentRow } from "./RouteSegmentRow";
import { ExpenseButton } from "./ExpenseButton";
import { PlacePhotosInline } from "./PlacePhotosInline";
import { PlaceForm } from "./PlaceForm";
import { DayTabSelector } from "./DayTabSelector";
import { getTripDays, groupByDay, dayColor, formatDayLabel } from "./days";
import type { PlaceEntry } from "./types";

type DayStat = { placeCount: number; durationSec: number; distanceM: number; cost: number };

function DragHandle(props: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      aria-label="순서 변경"
      className="flex-none cursor-grab touch-none rounded px-1 py-1 text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="6" r="1.4" fill="currentColor" />
        <circle cx="9" cy="12" r="1.4" fill="currentColor" />
        <circle cx="9" cy="18" r="1.4" fill="currentColor" />
        <circle cx="15" cy="6" r="1.4" fill="currentColor" />
        <circle cx="15" cy="12" r="1.4" fill="currentColor" />
        <circle cx="15" cy="18" r="1.4" fill="currentColor" />
      </svg>
    </button>
  );
}

// 크로스데이 드래그 대신 쓰는 "다른 날짜로 이동" 드롭다운 — ProfileMenu/TripMetaEditor의
// 클릭아웃사이드 드롭다운 패턴 재사용.
function MoveToDayMenu({
  days,
  currentDayIndex,
  onMove,
}: {
  days: Date[];
  currentDayIndex: number;
  onMove: (destDayIndex: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="다른 날짜로 이동"
        title="다른 날짜로 이동"
        className="flex flex-none items-center rounded p-1 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-600"
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 text-left shadow-lg">
          {days.map((date, dayIndex) =>
            dayIndex === currentDayIndex ? null : (
              <button
                key={dayIndex}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onMove(dayIndex);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-50"
              >
                {formatDayLabel(date, dayIndex + 1)}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}

function SortablePlaceRow({
  tripId,
  place,
  index,
  dayIndex,
  days,
  nextPlace,
  selected,
  onDelete,
  onSelect,
  onMoveToDay,
}: {
  tripId: string;
  place: PlaceEntry;
  index: number;
  dayIndex: number;
  days: Date[];
  nextPlace: PlaceEntry | null;
  selected: boolean;
  onDelete: (place: PlaceEntry) => void;
  onSelect: (placeId: string) => void;
  onMoveToDay: (destDayIndex: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
  });
  const [photosOpen, setPhotosOpen] = useState(false);
  const thumbnail = place.photos[0]?.storageKey;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`overflow-hidden rounded-2xl border shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-colors ${
        isDragging ? "border-blue-300 bg-blue-50/60 opacity-70" : selected ? "border-blue-300 bg-blue-50/40" : "border-neutral-100 bg-white"
      }`}
    >
      <div className="flex items-start gap-2 px-3 py-3">
        <DragHandle {...attributes} {...listeners} />
        <span
          className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: dayColor(dayIndex) }}
        >
          {index + 1}
        </span>
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
        ) : null}
        <button
          type="button"
          onClick={() => onSelect(place.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold text-neutral-900">{place.name}</p>
          {place.address ? (
            <p className="truncate text-xs text-neutral-400">{place.address}</p>
          ) : null}
          {place.category ? (
            <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
              {place.category}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPhotosOpen((v) => !v);
          }}
          aria-label="사진"
          className="flex flex-none items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        >
          <Camera className="h-3.5 w-3.5" />
          {place.photos.length > 0 ? place.photos.length : ""}
        </button>
        {days.length > 1 ? (
          <MoveToDayMenu days={days} currentDayIndex={dayIndex} onMove={onMoveToDay} />
        ) : null}
        <button
          onClick={() => onDelete(place)}
          aria-label="삭제"
          className="flex-none rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-3 pb-3">
        <ExpenseButton tripId={tripId} placeId={place.id} expenses={place.expenses} />
        <PlacePhotosInline
          tripId={tripId}
          placeId={place.id}
          initialPhotos={place.photos}
          open={photosOpen}
        />
      </div>
      {nextPlace ? (
        <RouteSegmentRow tripId={tripId} fromPlaceId={place.id} toPlaceId={nextPlace.id} />
      ) : null}
    </li>
  );
}

export function PlaceList({
  tripId,
  trip,
  places,
  dayStats,
  selectedDay,
  onSelectDay,
  selectedPlaceId,
  onSelectPlace,
  onDeletePlace,
  onDragEnd,
  onMoveToDay,
}: {
  tripId: string;
  trip: { startDate: string | Date; endDate: string | Date };
  places: PlaceEntry[];
  dayStats: DayStat[];
  selectedDay: number;
  onSelectDay: (dayIndex: number) => void;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  onDeletePlace: (place: PlaceEntry) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onMoveToDay: (place: PlaceEntry, destDayIndex: number) => void;
}) {
  const days = getTripDays(trip.startDate, trip.endDate);
  const groups = groupByDay(places, days);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [addOpen, setAddOpen] = useState(false);

  // 지도 이동경로 표시도 이 날짜를 따르므로(TripWorkspace 참고) 범위는 부모가 이미 보정해서 내려주지만,
  // 여행 기간이 바뀌는 순간의 렌더링 대비 여기서도 한 번 더 방어
  const safeSelectedDay = Math.min(selectedDay, days.length - 1);
  const currentDate = days[safeSelectedDay];
  const currentGroup = groups[safeSelectedDay] ?? [];
  const stats = dayStats[safeSelectedDay] ?? { placeCount: 0, durationSec: 0, distanceM: 0, cost: 0 };

  return (
    <div className="flex h-full flex-col">
      {/* 날짜 탭 선택 — 한 번에 한 날짜만 본다(다른 날짜 드래그 대신 MoveToDayMenu 사용) */}
      <DayTabSelector days={days} selectedDay={safeSelectedDay} onSelect={onSelectDay} />

      {/* 선택된 날짜 요약 */}
      <div className="mx-3 mb-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-900">{formatDayLabel(currentDate, safeSelectedDay + 1)}</p>
          <span className="flex-none rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
            {stats.placeCount}곳
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span>🚗 {stats.durationSec > 0 ? `${Math.round(stats.durationSec / 60)}분` : "-"}</span>
          <span>📍 {stats.distanceM > 0 ? `${(stats.distanceM / 1000).toFixed(1)}km` : "-"}</span>
          <span className="font-semibold text-amber-600">₩{stats.cost.toLocaleString()}</span>
        </div>
      </div>

      {/* 타임라인 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <DndContext
          id={`place-list-${tripId}-${safeSelectedDay}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          {currentGroup.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-neutral-400">이 날짜에 등록된 장소가 없습니다.</p>
          ) : (
            <SortableContext items={currentGroup.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <ol className="flex flex-col gap-2">
                {currentGroup.map((place, index) => (
                  <SortablePlaceRow
                    key={place.id}
                    tripId={tripId}
                    place={place}
                    index={index}
                    dayIndex={safeSelectedDay}
                    days={days}
                    nextPlace={currentGroup[index + 1] ?? null}
                    selected={selectedPlaceId === place.id}
                    onDelete={onDeletePlace}
                    onSelect={onSelectPlace}
                    onMoveToDay={(destDayIndex) => onMoveToDay(place, destDayIndex)}
                  />
                ))}
              </ol>
            </SortableContext>
          )}
        </DndContext>

        {addOpen ? (
          <div className="mt-2 rounded-xl border border-neutral-200">
            <PlaceForm tripId={tripId} scheduledAt={currentDate} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-2 flex h-11 w-full items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-sm font-semibold text-neutral-500 hover:border-neutral-400 hover:bg-neutral-50"
          >
            <Plus className="h-4 w-4" /> 장소 추가
          </button>
        )}
      </div>
    </div>
  );
}
