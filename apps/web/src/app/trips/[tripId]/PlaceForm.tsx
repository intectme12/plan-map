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
  // 검색을 쓸 수 없는 이유(키 미설정·일시 장애·요청 과다) — 서버가 준 메시지를 그대로 보여준다
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 지금 화면에 결과가 떠 있는 검색어 — 앞뒤 공백만 바뀐 경우처럼 같은 검색어면 다시 요청하지 않는다.
  // (카카오 Local API는 운영정책상 결과 캐시/저장이 금지라, 지나간 검색어의 결과를 보관해 재사용하지는 않음)
  const lastQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      lastQueryRef.current = null;
      setResults([]);
      setSearching(false);
      return;
    }
    if (trimmed === lastQueryRef.current) return;

    debounceRef.current = setTimeout(async () => {
      lastQueryRef.current = trimmed;
      setSearching(true);
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(trimmed)}`);
      setSearching(false);

      if (res.status === 503 || res.status === 429) {
        lastQueryRef.current = null;
        const data = await res.json().catch(() => null);
        setUnavailable(typeof data?.error === "string" ? data.error : "장소 검색을 사용할 수 없습니다.");
        setResults([]);
        return;
      }
      if (!res.ok) {
        lastQueryRef.current = null;
        setResults([]);
        return;
      }
      const data = await res.json();
      setUnavailable(null);
      setResults(data.candidates ?? []);
    }, 400);

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
      // 장소 수 상한(403)·추가 요청 과다(429) 등은 서버 안내 문구를 그대로 보여준다
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "장소를 추가하지 못했습니다.");
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
        <p className="text-xs text-neutral-400">{unavailable}</p>
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
