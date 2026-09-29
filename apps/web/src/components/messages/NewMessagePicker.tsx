"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, UserX } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { OtherUser } from "./MessagesPanelProvider";

type UserResult = { id: string; nickname: string; bio: string | null; avatarUrl: string | null };

// 메시지 패널의 "새 메시지 작성" 화면 — 기존 회원 검색 API(/api/users/search)로 상대를 찾고,
// 프로필의 "메시지 보내기"(SendMessageButton)와 같은 POST /api/conversations로 대화를 연다
// (이미 대화방이 있으면 서버가 기존 방을 돌려줌). 검색어가 비어 있으면 검색 API가 돌려주는
// 기본 목록(여행 목록 공개 회원)을 추천처럼 보여준다.
export function NewMessagePicker({
  currentUserId,
  onStarted,
}: {
  currentUserId: string;
  onStarted: (conversationId: string, other: OtherUser) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const latestQueryRef = useRef("");

  // 늦게 도착한 이전 검색어의 응답이 최신 결과를 덮어쓰지 않도록 latestQueryRef로 거른다
  useEffect(() => {
    latestQueryRef.current = query;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) throw new Error();
        const data: UserResult[] = await res.json();
        if (latestQueryRef.current !== query) return;
        setFailed(false);
        // 검색어가 있으면 서버가 본인도 포함해 돌려주므로 여기서 뺀다(자기 자신과는 대화할 수 없음)
        setResults(data.filter((u) => u.id !== currentUserId));
      } catch {
        if (latestQueryRef.current === query) setFailed(true);
      }
    }, query.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  async function start(user: UserResult) {
    if (startingId) return;
    setStartingId(user.id);
    setStartError(null);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    setStartingId(null);
    if (!res.ok) {
      setStartError("대화를 시작하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    const conversation = await res.json();
    onStarted(conversation.id, { id: user.id, nickname: user.nickname, avatarUrl: user.avatarUrl });
  }

  const searching = results === null && !failed;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-none px-5 pt-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="메시지를 보낼 회원 닉네임 검색"
            aria-label="메시지를 보낼 회원 검색"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3.5 pl-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {query.trim() ? "검색 결과" : "추천 회원 · 닉네임으로 검색할 수 있어요"}
        </p>
        {startError ? (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {startError}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {failed ? (
          <p className="px-5 py-16 text-center text-sm text-slate-500">회원을 불러오지 못했습니다. 다시 검색해주세요.</p>
        ) : searching ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-label="검색 중" />
          </div>
        ) : results!.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <UserX className="h-5 w-5" />
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {query.trim() ? "검색 결과가 없습니다." : "추천할 회원이 없습니다."}
            </p>
            <p className="text-xs text-slate-500">닉네임을 다시 확인해주세요.</p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {results!.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => start(u)}
                  disabled={startingId !== null}
                  className="flex min-h-[68px] w-full items-center gap-3 border-b border-slate-100 px-5 py-2.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  <Avatar url={u.avatarUrl} nickname={u.nickname} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-slate-900">{u.nickname}</p>
                    {u.bio ? <p className="mt-0.5 truncate text-[13px] text-slate-500">{u.bio}</p> : null}
                  </div>
                  {startingId === u.id ? (
                    <Loader2 className="h-4 w-4 flex-none animate-spin text-blue-600" />
                  ) : (
                    <span className="flex-none text-xs font-semibold text-blue-600">메시지</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
