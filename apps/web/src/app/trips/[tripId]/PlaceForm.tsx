"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchCandidate = {
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  roadAddress: string | null;
  placeUrl: string | null;
  category: string | null;
  phone: string | null;
};

export function PlaceForm({ tripId, scheduledAt }: { tripId: string; scheduledAt?: Date }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingName, setAddingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(trimmed)}`);
      setSearching(false);

      if (res.status === 503) {
        setUnavailable(true);
        setResults([]);
        return;
      }
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      setUnavailable(false);
      setResults(data.candidates ?? []);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function addPlace(candidate: SearchCandidate) {
    setAddingName(candidate.name);
    setError(null);

    const res = await fetch(`/api/trips/${tripId}/places`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: candidate.name,
        category: candidate.category ?? undefined,
        lat: candidate.lat,
        lng: candidate.lng,
        address: candidate.address ?? undefined,
        roadAddress: candidate.roadAddress ?? undefined,
        placeUrl: candidate.placeUrl ?? undefined,
        phone: candidate.phone ?? undefined,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : undefined,
      }),
    });

    setAddingName(null);
    if (!res.ok) {
      setError("장소를 추가하지 못했습니다.");
      return;
    }
    setQuery("");
    setResults([]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <input
        placeholder="장소 검색 (예: 경복궁, 강남역 스타벅스)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />

      {unavailable ? (
        <p className="text-xs text-neutral-400">
          장소 검색을 사용하려면 .env의 KAKAO_REST_API_KEY를 설정하세요.
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {searching ? <p className="text-xs text-neutral-400">검색 중...</p> : null}

      {results.length > 0 ? (
        <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-md border border-neutral-200 p-1">
          {results.map((c, i) => (
            <li key={`${c.name}-${i}`}>
              <button
                type="button"
                onClick={() => addPlace(c)}
                disabled={addingName === c.name}
                className="flex w-full flex-col items-start rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-50 disabled:opacity-50"
              >
                <span className="font-semibold">
                  {c.name}
                  {addingName === c.name ? (
                    <span className="ml-1 text-xs font-normal text-neutral-400">추가 중...</span>
                  ) : null}
                </span>
                <span className="truncate text-xs text-neutral-400">
                  {c.category ? `${c.category} · ` : ""}
                  {c.address ?? c.roadAddress ?? ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
