"use client";

import { useRouter } from "next/navigation";
import type { PlaceEntry } from "./types";

export function PlaceList({ tripId, places }: { tripId: string; places: PlaceEntry[] }) {
  const router = useRouter();

  async function onDelete(placeId: string) {
    await fetch(`/api/trips/${tripId}/places/${placeId}`, { method: "DELETE" });
    router.refresh();
  }

  if (places.length === 0) {
    return <p className="p-3 text-sm text-neutral-500">장소를 추가해보세요.</p>;
  }

  return (
    <ol className="flex flex-col gap-1 overflow-y-auto p-2">
      {places.map((place, index) => (
        <li
          key={place.id}
          className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-neutral-50"
        >
          <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border border-neutral-300 text-[11px] font-semibold text-neutral-600">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{place.name}</p>
            {place.address ? (
              <p className="truncate text-xs text-neutral-400">{place.address}</p>
            ) : null}
          </div>
          <button
            onClick={() => onDelete(place.id)}
            aria-label="삭제"
            className="flex-none rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
          >
            삭제
          </button>
        </li>
      ))}
    </ol>
  );
}
