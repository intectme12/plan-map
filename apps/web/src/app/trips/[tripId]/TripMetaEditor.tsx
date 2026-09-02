"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TripMeta = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  personnel: number;
};

function toDateInputValue(d: string | Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function TripMetaEditor({ trip }: { trip: TripMeta }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(toDateInputValue(trip.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(trip.endDate));
  const [personnel, setPersonnel] = useState(trip.personnel);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch(`/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startDate, endDate, personnel }),
    });
    setPending(false);
    if (!res.ok) {
      setError("수정하지 못했습니다.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">{trip.name}</h1>
          <p className="text-sm text-neutral-500">
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · {trip.personnel}명
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          aria-label="여행 정보 수정"
          className="flex-none rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-50"
        >
          수정
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-semibold"
      />
      <div className="flex gap-2">
        <input
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-1/2 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="date"
          required
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-1/2 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <input
        type="number"
        min={1}
        max={50}
        value={personnel}
        onChange={(e) => setPersonnel(Number(e.target.value))}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs"
        >
          취소
        </button>
      </div>
    </form>
  );
}
