"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { TripGridCard } from "./TripGridCard";

export type Trip = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  personnel: number;
  coverPhotoKey: string | null;
  _count: { places: number };
};

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
    <div className="grid grid-cols-4 gap-1">
      {trips.map((trip) => (
        <TripGridCard
          key={trip.id}
          trip={trip}
          href={`/trips/${trip.id}`}
          onDelete={() => handleDelete(trip)}
        />
      ))}
    </div>
  );
}
