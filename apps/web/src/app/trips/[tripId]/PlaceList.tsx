"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/components/toast/ToastProvider";
import { RouteSegmentRow } from "./RouteSegmentRow";
import { ExpenseButton } from "./ExpenseButton";
import { PlacePhotosInline } from "./PlacePhotosInline";
import { PlaceForm } from "./PlaceForm";
import { getTripDays, groupByDay, formatDayLabel, dayColor } from "./days";
import type { PlaceEntry } from "./types";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={`flex-none text-neutral-400 transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

function SortablePlaceRow({
  tripId,
  place,
  index,
  nextPlace,
  selected,
  onDelete,
  onSelect,
}: {
  tripId: string;
  place: PlaceEntry;
  index: number;
  nextPlace: PlaceEntry | null;
  selected: boolean;
  onDelete: (place: PlaceEntry) => void;
  onSelect: (placeId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
  });
  const [photosOpen, setPhotosOpen] = useState(false);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "bg-neutral-50 opacity-70" : ""}
    >
      <div
        className={`flex items-start gap-1 rounded-md px-1 py-2 hover:bg-neutral-50 ${
          selected ? "bg-blue-50" : ""
        }`}
      >
        <DragHandle {...attributes} {...listeners} />
        <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border border-neutral-300 text-[11px] font-semibold text-neutral-600">
          {index + 1}
        </span>
        <button
          type="button"
          onClick={() => onSelect(place.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold">{place.name}</p>
          {place.address ? (
            <p className="truncate text-xs text-neutral-400">{place.address}</p>
          ) : null}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPhotosOpen((v) => !v);
          }}
          aria-label="사진"
          className="flex-none rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        >
          📷{place.photos.length > 0 ? ` ${place.photos.length}` : ""}
        </button>
        <button
          onClick={() => onDelete(place)}
          aria-label="삭제"
          className="flex-none rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
        >
          삭제
        </button>
      </div>
      <ExpenseButton tripId={tripId} placeId={place.id} expenses={place.expenses} />
      <PlacePhotosInline
        tripId={tripId}
        placeId={place.id}
        initialPhotos={place.photos}
        open={photosOpen}
      />
      {nextPlace ? (
        <RouteSegmentRow tripId={tripId} fromPlaceId={place.id} toPlaceId={nextPlace.id} />
      ) : null}
    </li>
  );
}

function DaySection({
  tripId,
  dayIndex,
  date,
  dayNumber,
  places,
  nextAfterLast,
  open,
  onToggle,
  selectedPlaceId,
  onDelete,
  onSelect,
  onDragEnd,
}: {
  tripId: string;
  dayIndex: number;
  date: Date;
  dayNumber: number;
  places: PlaceEntry[];
  nextAfterLast: PlaceEntry | null;
  open: boolean;
  onToggle: () => void;
  selectedPlaceId: string | null;
  onDelete: (place: PlaceEntry) => void;
  onSelect: (placeId: string) => void;
  onDragEnd: (dayIndex: number) => (event: DragEndEvent) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  return (
    <div className="rounded-md border border-neutral-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
      >
        <Chevron open={open} />
        <span
          className="h-2 w-2 flex-none rounded-full"
          style={{ background: dayColor(dayIndex) }}
        />
        <span className="flex-1">{formatDayLabel(date, dayNumber)}</span>
        {places.length > 0 ? (
          <span className="flex-none text-xs font-normal text-neutral-400">{places.length}곳</span>
        ) : null}
      </button>

      {open ? (
        <div className="border-t border-neutral-200 p-2">
          {places.length === 0 ? (
            <p className="px-1 py-2 text-xs text-neutral-400">등록된 장소가 없습니다.</p>
          ) : (
            <DndContext
              id={`place-day-${tripId}-${dayIndex}`}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd(dayIndex)}
            >
              <SortableContext items={places.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <ol className="flex flex-col gap-1">
                  {places.map((place, index) => (
                    <SortablePlaceRow
                      key={place.id}
                      tripId={tripId}
                      place={place}
                      index={index}
                      nextPlace={places[index + 1] ?? nextAfterLast}
                      selected={selectedPlaceId === place.id}
                      onDelete={onDelete}
                      onSelect={onSelect}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          <PlaceForm tripId={tripId} scheduledAt={date} />
        </div>
      ) : null}
    </div>
  );
}

export function PlaceList({
  tripId,
  trip,
  places,
  selectedPlaceId,
  onSelectPlace,
  expandedDays,
  onToggleDay,
}: {
  tripId: string;
  trip: { startDate: string | Date; endDate: string | Date };
  places: PlaceEntry[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  expandedDays: Set<number>;
  onToggleDay: (dayIndex: number) => void;
}) {
  const [items, setItems] = useState(places);
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const reorderTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const toast = useToast();

  const days = getTripDays(trip.startDate, trip.endDate);
  const groups = groupByDay(items, days);

  useEffect(() => {
    setItems(places.filter((p) => !pendingDeletes.current.has(p.id)));
  }, [places]);

  function handleDelete(place: PlaceEntry) {
    setItems((prev) => prev.filter((p) => p.id !== place.id));

    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(place.id);
      await fetch(`/api/trips/${tripId}/places/${place.id}`, { method: "DELETE" });
    }, 5000);
    pendingDeletes.current.set(place.id, timer);

    toast.show(`${place.name} 삭제됨`, {
      actionLabel: "실행취소",
      onAction: () => {
        clearTimeout(timer);
        pendingDeletes.current.delete(place.id);
        setItems((prev) => {
          if (prev.some((p) => p.id === place.id)) return prev;
          const restored = [...prev, place];
          restored.sort((a, b) => a.order - b.order);
          return restored;
        });
      },
    });
  }

  function handleDragEnd(dayIndex: number) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setItems((prev) => {
        const group = groupByDay(prev, days)[dayIndex];
        const oldIndex = group.findIndex((p) => p.id === active.id);
        const newIndex = group.findIndex((p) => p.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return prev;

        const reorderedGroup = arrayMove(group, oldIndex, newIndex);
        const orderSlots = group.map((p) => p.order).sort((a, b) => a - b);
        const orderById = new Map(reorderedGroup.map((p, i) => [p.id, orderSlots[i]]));

        const next = prev.map((p) => (orderById.has(p.id) ? { ...p, order: orderById.get(p.id)! } : p));
        next.sort((a, b) => a.order - b.order);

        if (reorderTimers.current.has(dayIndex)) clearTimeout(reorderTimers.current.get(dayIndex));
        const timer = setTimeout(() => {
          reorderedGroup.forEach((p) => {
            fetch(`/api/trips/${tripId}/places/${p.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: orderById.get(p.id) }),
            });
          });
        }, 500);
        reorderTimers.current.set(dayIndex, timer);

        return next;
      });
    };
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-2">
      {days.map((date, dayIndex) => {
        const nextGroup = groups.slice(dayIndex + 1).find((g) => g.length > 0);
        return (
          <DaySection
            key={dayIndex}
            tripId={tripId}
            dayIndex={dayIndex}
            date={date}
            dayNumber={dayIndex + 1}
            places={groups[dayIndex]}
            nextAfterLast={nextGroup ? nextGroup[0] : null}
            open={expandedDays.has(dayIndex)}
            onToggle={() => onToggleDay(dayIndex)}
            selectedPlaceId={selectedPlaceId}
            onDelete={handleDelete}
            onSelect={onSelectPlace}
            onDragEnd={handleDragEnd}
          />
        );
      })}
    </div>
  );
}
