"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, UserPlus } from "lucide-react";
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

type ShareContext = {
  owner: { id: string; nickname: string; avatarUrl: string | null };
  guests: { id: string; name: string }[];
};

// visibility(공개범위)와 별개로, 특정 회원을 콕 집어 공유(초대)하는 기능 — PRIVATE 상태에서도 동작한다.
// 초대(TripShare)는 여행 내용 편집 권한까지 주므로 "함께 편집"으로 안내한다. 추가/해제는 누르는 즉시 서버에 반영.
export function TripShareManager({
  tripId,
  onSharesChange,
}: {
  tripId: string;
  onSharesChange?: (count: number) => void;
}) {
  const [shares, setShares] = useState<ShareEntry[] | null>(null);
  const [context, setContext] = useState<ShareContext | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[] | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const latestQueryRef = useRef("");

  const onSharesChangeRef = useRef(onSharesChange);
  useEffect(() => {
    onSharesChangeRef.current = onSharesChange;
  });
  useEffect(() => {
    if (shares) onSharesChangeRef.current?.(shares.length);
  }, [shares]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/trips/${tripId}/shares`).then((res) => (res.ok ? res.json() : Promise.reject())),
      fetch(`/api/trips/${tripId}/share-context`).then((res) => (res.ok ? res.json() : Promise.reject())),
    ])
      .then(([shareData, ctx]: [ShareEntry[], ShareContext]) => {
        if (cancelled) return;
        setShares(shareData);
        setContext(ctx);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // 입력할 때만 300ms 디바운스로 조회(빈 검색어는 호출 안 함). 늦게 온 옛 검색어의 응답은 버린다.
  useEffect(() => {
    latestQueryRef.current = query;
    if (!query.trim()) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) throw new Error();
        const data: UserResult[] = await res.json();
        if (latestQueryRef.current !== query) return;
        setSearchFailed(false);
        setResults(data);
      } catch {
        if (latestQueryRef.current === query) setSearchFailed(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function invite(user: UserResult) {
    setError(null);
    setAddingId(user.id);
    const res = await fetch(`/api/trips/${tripId}/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: user.nickname }),
    });
    setAddingId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "초대하지 못했습니다.");
      return;
    }
    const share: ShareEntry = await res.json();
    setShares((prev) => (prev?.some((s) => s.user.id === share.user.id) ? prev : [...(prev ?? []), share]));
  }

  async function remove(userId: string) {
    setError(null);
    setRemovingId(userId);
    const res = await fetch(`/api/trips/${tripId}/shares/${userId}`, { method: "DELETE" }).catch(() => null);
    setRemovingId(null);
    setConfirmingId(null);
    if (!res?.ok) {
      setError("공유를 해제하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setShares((prev) => prev?.filter((s) => s.user.id !== userId) ?? prev);
  }

  const sharedIds = new Set(shares?.map((s) => s.user.id));
  const ownerId = context?.owner.id;
  // 검색 API는 검색어가 있으면 본인도 돌려주는데, 자기 자신에게는 공유할 수 없어서 뺀다
  const visibleResults = results?.filter((u) => u.id !== ownerId) ?? null;
  const hasQuery = Boolean(query.trim());

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="닉네임으로 회원 검색"
          aria-label="초대할 회원 닉네임 검색"
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3.5 pl-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15"
        />
      </div>

      {hasQuery ? (
        <div className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {searchFailed ? (
            <p className="px-2.5 py-2 text-xs text-red-600">검색하지 못했습니다. 다시 시도해주세요.</p>
          ) : visibleResults === null ? (
            <p className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 검색 중...
            </p>
          ) : visibleResults.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-slate-500">검색 결과가 없습니다.</p>
          ) : (
            <ul className="flex max-h-48 flex-col overflow-y-auto">
              {visibleResults.map((u) => {
                const shared = sharedIds.has(u.id);
                return (
                  <li key={u.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-slate-50">
                    <Avatar url={u.avatarUrl} nickname={u.nickname} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{u.nickname}</p>
                      {u.bio ? <p className="truncate text-xs text-slate-400">{u.bio}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => invite(u)}
                      disabled={shared || addingId !== null}
                      className={`flex h-8 flex-none items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors ${
                        shared
                          ? "bg-slate-100 text-slate-400"
                          : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                      }`}
                    >
                      {shared ? (
                        "초대됨"
                      ) : addingId === u.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" /> 초대
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      {loadFailed ? (
        <p className="text-xs text-red-600">공유 대상을 불러오지 못했습니다. 팝업을 다시 열어주세요.</p>
      ) : shares === null || context === null ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 불러오는 중...
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200">
          <li className="flex items-center gap-3 px-3.5 py-2.5">
            <Avatar url={context.owner.avatarUrl} nickname={context.owner.nickname} size={32} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
              {context.owner.nickname} <span className="text-slate-400">(나)</span>
            </span>
            <span className="flex-none rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">소유자</span>
          </li>

          {shares.map((share) => {
            const confirming = confirmingId === share.user.id;
            return (
              <li key={share.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <Avatar url={share.user.avatarUrl} nickname={share.user.nickname} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{share.user.nickname}</span>
                {confirming ? (
                  <span className="flex flex-none items-center gap-1">
                    <span className="mr-1 text-xs text-slate-500">해제할까요?</span>
                    <button
                      type="button"
                      onClick={() => remove(share.user.id)}
                      disabled={removingId !== null}
                      className="h-7 rounded-lg bg-red-600 px-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {removingId === share.user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "해제"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      disabled={removingId !== null}
                      className="h-7 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
                    >
                      취소
                    </button>
                  </span>
                ) : (
                  <>
                    <span className="flex-none rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                      함께 편집
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(share.user.id)}
                      aria-label={`${share.user.nickname} 공유 해제`}
                      className="h-7 flex-none rounded-lg px-2 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      해제
                    </button>
                  </>
                )}
              </li>
            );
          })}

          {shares.length === 0 ? (
            <li className="px-3.5 py-3 text-xs text-slate-400">아직 초대한 회원이 없어요. 위에서 닉네임으로 검색해 초대해보세요.</li>
          ) : null}

          {context.guests.map((guest) => (
            <li key={guest.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <Avatar url={null} nickname={guest.name} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{guest.name}</span>
              <span
                title="Triply 계정이 없어 여행을 열어볼 수는 없어요"
                className="flex-none rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-500"
              >
                미가입 동행자
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
