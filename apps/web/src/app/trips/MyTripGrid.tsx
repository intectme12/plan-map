"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { MyTripCard, type MyTripCardData } from "./MyTripCard";
import { TripCreateForm } from "./TripCreateForm";
import { TripSortSelect } from "./TripSortSelect";

export function MyTripGrid({
  trips: initialTrips,
  sort,
  nickname,
  avatarUrl,
}: {
  trips: MyTripCardData[];
  sort: string;
  nickname: string;
  avatarUrl: string | null;
}) {
  const [trips, setTrips] = useState(initialTrips);
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const toast = useToast();

  useEffect(() => {
    setTrips(initialTrips.filter((t) => !pendingDeletes.current.has(t.id)));
  }, [initialTrips]);

  function handleDelete(trip: MyTripCardData) {
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

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">
            내 여행계획 <span className="text-neutral-400">{trips.length}</span>
          </h2>
          <p className="mt-1 text-sm text-neutral-500">지금까지 만든 나만의 여행 계획이에요.</p>
        </div>
        <TripSortSelect value={sort} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip) => (
          <MyTripCard
            key={trip.id}
            trip={trip}
            nickname={nickname}
            avatarUrl={avatarUrl}
            onDelete={() => handleDelete(trip)}
          />
        ))}
        <TripCreateForm />
      </div>
    </section>
  );
}
