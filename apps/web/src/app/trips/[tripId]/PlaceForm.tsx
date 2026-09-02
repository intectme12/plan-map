"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlaceForm({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch(`/api/trips/${tripId}/places`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category: category || undefined,
        lat: Number(lat),
        lng: Number(lng),
        address: address || undefined,
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError("장소를 추가하지 못했습니다. 위도/경도를 확인해주세요.");
      return;
    }
    setName("");
    setCategory("");
    setLat("");
    setLng("");
    setAddress("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 border-b border-neutral-200 p-3">
      <input
        required
        placeholder="장소명"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <input
          required
          placeholder="위도 (lat)"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className="w-1/2 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          required
          placeholder="경도 (lng)"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          className="w-1/2 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <input
        placeholder="카테고리 (선택)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <input
        placeholder="주소 (선택)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "추가 중..." : "장소 추가"}
      </button>
      <p className="text-xs text-neutral-400">
        지도 검색으로 위경도를 자동 채우는 기능은 카카오 키 설정 후 연결됩니다. 지금은 직접
        입력해주세요.
      </p>
    </form>
  );
}
