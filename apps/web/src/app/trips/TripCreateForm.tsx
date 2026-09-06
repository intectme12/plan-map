"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TripCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [personnel, setPersonnel] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startDate, endDate, personnel }),
    });
    setPending(false);
    if (!res.ok) {
      setError("여행을 만들지 못했습니다. 입력값을 확인해주세요.");
      return;
    }
    const trip = await res.json();
    setOpen(false);
    setName("");
    setStartDate("");
    setEndDate("");
    setPersonnel(1);
    router.push(`/trips/${trip.id}`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
      >
        새 여행 만들기
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4"
    >
      <input
        required
        placeholder="여행 제목 (ex. 강릉 1박 2일)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <input
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          required
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <input
        type="number"
        min={1}
        max={50}
        value={personnel}
        onChange={(e) => setPersonnel(Number(e.target.value))}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "만드는 중..." : "만들기"}
        </button>
      </div>
    </form>
  );
}
