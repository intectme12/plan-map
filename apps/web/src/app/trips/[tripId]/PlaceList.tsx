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
import type { PlaceEntry } from "./types";

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

export function PlaceList({
  tripId,
  places,
  selectedPlaceId,
  onSelectPlace,
}: {
  tripId: string;
  places: PlaceEntry[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
}) {
  const [items, setItems] = useState(places);
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  useEffect(() => {
    setItems(places.filter((p) => !pendingDeletes.current.has(p.id)));
  }, [places]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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
          const restored = [...prev];
          restored.splice(place.order - 1, 0, place);
          return restored;
        });
      },
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);

      if (reorderTimer.current) clearTimeout(reorderTimer.current);
      reorderTimer.current = setTimeout(() => {
        reordered.forEach((place, index) => {
          fetch(`/api/trips/${tripId}/places/${place.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: index + 1 }),
          });
        });
      }, 500);

      return reordered;
    });
  }

  if (items.length === 0) {
    return <p className="p-3 text-sm text-neutral-500">장소를 추가해보세요.</p>;
  }

  return (
    <DndContext
      id={`place-list-${tripId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col gap-1 overflow-y-auto p-2">
          {items.map((place, index) => (
            <SortablePlaceRow
              key={place.id}
              tripId={tripId}
              place={place}
              index={index}
              nextPlace={items[index + 1] ?? null}
              selected={selectedPlaceId === place.id}
              onDelete={handleDelete}
              onSelect={onSelectPlace}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
