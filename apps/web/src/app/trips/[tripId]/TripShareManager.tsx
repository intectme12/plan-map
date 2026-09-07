"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";

type ShareEntry = {
  id: string;
  user: { id: string; nickname: string; avatarUrl: string | null };
};

type UserResult = {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
};

// visibility(공개범위)와 별개로, 특정 회원을 콕 집어 공유하는 기능 — PRIVATE 상태에서도 동작한다
export function TripShareManager({ tripId }: { tripId: string }) {
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

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

  async function runSearch(q: string) {
    setSearching(true);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    const data: UserResult[] = res.ok ? await res.json() : [];
    setSearching(false);
    setResults(data);
  }

  // 검색어가 비어있으면 조회하지 않고, 입력할 때만 300ms 디바운스로 조회
  useEffect(() => {
    // 렌더 쪽에서 이미 query가 비었을 때는 results를 안 보여주니 굳이 여기서 지울 필요가 없다.
    if (!query.trim()) return;
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) runSearch(query);
  }

  async function addShare(targetNickname: string, targetId?: string) {
    setError(null);
    if (targetId) setAddingId(targetId);
    const res = await fetch(`/api/trips/${tripId}/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: targetNickname }),
    });
    if (targetId) setAddingId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "공유하지 못했습니다.");
      return;
    }
    const share: ShareEntry = await res.json();
    setShares((prev) => (prev.some((s) => s.user.id === share.user.id) ? prev : [...prev, share]));
  }

  async function onRemove(userId: string) {
    setShares((prev) => prev.filter((s) => s.user.id !== userId));
    await fetch(`/api/trips/${tripId}/shares/${userId}`, { method: "DELETE" });
  }

  const sharedIds = new Set(shares.map((s) => s.user.id));

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={onSearchSubmit} className="flex items-center gap-1">
        <p className="flex-none text-xs font-semibold text-neutral-500">공유</p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="닉네임으로 검색"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
        />
        <button
          type="submit"
          className="flex-none rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-50"
        >
          검색
        </button>
      </form>

      <div className="flex flex-col gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 p-2">
        {!query.trim() ? (
          <p className="px-1 text-xs text-neutral-400">닉네임을 입력해보세요.</p>
        ) : searching ? (
          <p className="px-1 text-xs text-neutral-400">검색 중...</p>
        ) : results.length === 0 ? (
          <p className="px-1 text-xs text-neutral-400">검색 결과가 없습니다.</p>
        ) : (
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {results.map((u) => (
              <li key={u.id} className="flex items-center gap-2 rounded-md bg-white px-2 py-1">
                <Avatar url={u.avatarUrl} nickname={u.nickname} size={20} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{u.nickname}</p>
                  {u.bio ? <p className="truncate text-[11px] text-neutral-400">{u.bio}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => addShare(u.nickname, u.id)}
                  disabled={sharedIds.has(u.id) || addingId === u.id}
                  className="flex-none rounded-md border border-neutral-300 px-2 py-0.5 text-[11px] disabled:opacity-50"
                >
                  {sharedIds.has(u.id) ? "공유됨" : addingId === u.id ? "추가 중..." : "추가"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
