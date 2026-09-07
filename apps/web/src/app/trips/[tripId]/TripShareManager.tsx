"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";

type ShareEntry = {
  id: string;
  user: { id: string; nickname: string; avatarUrl: string | null };
};

// visibility(공개범위)와 별개로, 특정 회원을 콕 집어 공유하는 기능 — PRIVATE 상태에서도 동작한다
export function TripShareManager({ tripId }: { tripId: string }) {
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [nickname, setNickname] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/trips/${tripId}/shares`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ShareEntry[]) => {
        if (cancelled) return;
        setShares(data);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setError(null);
    setPending(true);
    const res = await fetch(`/api/trips/${tripId}/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nickname.trim() }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "공유하지 못했습니다.");
      return;
    }
    const share: ShareEntry = await res.json();
    setShares((prev) => (prev.some((s) => s.user.id === share.user.id) ? prev : [...prev, share]));
    setNickname("");
  }

  async function onRemove(userId: string) {
    setShares((prev) => prev.filter((s) => s.user.id !== userId));
    await fetch(`/api/trips/${tripId}/shares/${userId}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-neutral-500">공유 대상 (닉네임 지정)</p>
      <form onSubmit={onAdd} className="flex gap-1">
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임으로 추가"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
        />
        <button
          type="submit"
          disabled={pending || !nickname.trim()}
          className="flex-none rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-50"
        >
          추가
        </button>
      </form>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {loaded && shares.length === 0 ? (
        <p className="text-xs text-neutral-400">아직 지정 공유한 회원이 없습니다.</p>
      ) : null}
      {shares.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {shares.map((share) => (
            <li
              key={share.id}
              className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1"
            >
              <Avatar url={share.user.avatarUrl} nickname={share.user.nickname} size={20} />
              <span className="min-w-0 flex-1 truncate text-xs">{share.user.nickname}</span>
              <button
                type="button"
                onClick={() => onRemove(share.user.id)}
                className="flex-none text-xs text-neutral-400 hover:text-red-600"
              >
                제거
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
