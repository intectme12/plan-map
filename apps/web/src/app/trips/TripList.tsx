"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";

type Trip = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  personnel: number;
  _count: { places: number };
};

function formatDate(d: Trip["startDate"]) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function TripList({ trips: initialTrips }: { trips: Trip[] }) {
  const [trips, setTrips] = useState(initialTrips);
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const toast = useToast();

  useEffect(() => {
    setTrips(initialTrips.filter((t) => !pendingDeletes.current.has(t.id)));
  }, [initialTrips]);

  function handleDelete(trip: Trip) {
    setTrips((prev) => prev.filter((t) => t.id !== trip.id));

    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(trip.id);
      await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
    }, 5000);
    pendingDeletes.current.set(trip.id, timer);

    toast.show(`${trip.name} 삭제됨`, {
      actionLabel: "실행취소",
      onAction: () => {
        clearTimeout(timer);
        pendingDeletes.current.delete(trip.id);
        setTrips((prev) => (prev.some((t) => t.id === trip.id) ? prev : [...prev, trip]));
      },
    });
  }

  if (trips.length === 0) {
    return <p className="text-sm text-neutral-500">아직 만든 여행계획이 없어요.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {trips.map((trip) => (
        <li key={trip.id} className="flex items-center gap-2">
          <Link
            href={`/trips/${trip.id}`}
            className="flex flex-1 items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
          >
            <div>
              <p className="font-semibold">{trip.name}</p>
              <p className="text-sm text-neutral-500">
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · {trip.personnel}명
              </p>
            </div>
            <span className="text-sm text-neutral-400">장소 {trip._count.places}개</span>
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleDelete(trip);
            }}
            aria-label={`${trip.name} 삭제`}
            className="flex-none rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
          >
            삭제
          </button>
        </li>
      ))}
    </ul>
  );
}
