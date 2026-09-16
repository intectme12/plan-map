"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS: { value: string; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "oldest", label: "오래된순" },
  { value: "name", label: "이름순" },
];

export function TripSortSelect({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "latest") params.delete("sort");
    else params.set("sort", next);
    const qs = params.toString();
    router.push(`/trips${qs ? `?${qs}` : ""}`);
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
