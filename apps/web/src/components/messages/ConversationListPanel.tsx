"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, PenSquare, Search, SearchX, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useMessageStream } from "@/hooks/useMessageStream";
import type { OtherUser } from "./MessagesPanelProvider";

export type ConversationSummary = {
  id: string;
  other: OtherUser;
  lastMessageAt: string | Date;
  lastMessagePreview: string | null;
  unread: boolean;
  unreadCount: number;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 오늘: "오전 12:13" / 어제: "어제" / 올해: "09.28 (토)" / 그 이전: "2025.09.28"
function formatTime(value: string | Date) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "어제";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  if (date.getFullYear() === now.getFullYear()) return `${mm}.${dd} (${WEEKDAYS[date.getDay()]})`;
  return `${date.getFullYear()}.${mm}.${dd}`;
}

function StateMessage({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">{icon}</div>
      <p className="mt-1 text-sm font-semibold text-slate-900">{title}</p>
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul aria-label="대화방 불러오는 중" className="flex flex-col">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex min-h-[84px] items-center gap-3 border-b border-slate-100 px-5">
          <div className="h-12 w-12 flex-none animate-pulse rounded-full bg-slate-100" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ConversationListPanel({
  currentUserId,
  activeConversationId,
  onSelect,
  onCompose,
}: {
  currentUserId: string;
  activeConversationId: string | null;
  onSelect: (conversation: ConversationSummary) => void;
  onCompose: () => void;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");

  // 조회 실패를 빈 목록([])과 구분해 "다시 시도"를 보여준다(이전엔 실패해도 "대화 없음"으로 보였음)
  const load = useCallback(() => {
    return fetch("/api/conversations")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: ConversationSummary[]) => {
        setLoadFailed(false);
        setConversations(data);
      })
      .catch(() => setLoadFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function retry() {
    setLoadFailed(false);
    setConversations(null);
    load();
  }

  useMessageStream((event) => {
    setConversations((prev) => {
      if (!prev) return prev;
      const isMine = event.message.senderId === currentUserId;
      const isOpen = event.conversationId === activeConversationId;
      const existing = prev.find((c) => c.id === event.conversationId);
      if (!existing) {
        // 처음 받아보는 상대의 대화 — 이 이벤트만으론 상대 닉네임/아바타를 몰라서 목록 전체를 다시 불러온다.
        fetch("/api/conversations")
          .then((res) => (res.ok ? res.json() : null))
          .then((data: ConversationSummary[] | null) => {
            if (data) setConversations(data);
          });
        return prev;
      }

      const unread = !isMine && !isOpen;
      const updated: ConversationSummary = {
        ...existing,
        lastMessageAt: event.message.createdAt,
        lastMessagePreview: event.message.content ?? "사진",
        unread,
        // 내가 보낸 메시지(다른 탭 포함)면 그 대화는 읽은 상태로 본다
        unreadCount: unread ? (existing.unreadCount ?? 0) + 1 : 0,
      };
      const rest = prev.filter((c) => c.id !== event.conversationId);
      return [updated, ...rest];
    });
  });

  function select(c: ConversationSummary) {
    // 열면 서버에서 읽음 처리되므로(ConversationPanelBody) 목록에도 바로 반영
    setConversations((prev) => prev?.map((x) => (x.id === c.id ? { ...x, unread: false, unreadCount: 0 } : x)) ?? prev);
    onSelect(c);
  }

  const term = query.trim().toLowerCase();
  const filtered =
    conversations && term
      ? conversations.filter(
          (c) =>
            (c.other.nickname || "").toLowerCase().includes(term) ||
            (c.lastMessagePreview ?? "").toLowerCase().includes(term)
        )
      : conversations;

  const composeButton = (
    <button
      type="button"
      onClick={onCompose}
      className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
    >
      <PenSquare className="h-4 w-4" /> 새 메시지 작성
    </button>
  );

  let body: React.ReactNode;
  if (loadFailed) {
    body = (
      <StateMessage
        icon={<TriangleAlert className="h-5 w-5" />}
        title="대화방을 불러오지 못했습니다."
        description="잠시 후 다시 시도해주세요."
        action={
          <button
            type="button"
            onClick={retry}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            다시 시도
          </button>
        }
      />
    );
  } else if (conversations === null) {
    body = <ListSkeleton />;
  } else if (conversations.length === 0) {
    body = (
      <StateMessage
        icon={<MessageCircle className="h-5 w-5" />}
        title="아직 대화방이 없습니다."
        description="새 대화를 시작해보세요."
      />
    );
  } else if (filtered && filtered.length === 0) {
    body = (
      <StateMessage
        icon={<SearchX className="h-5 w-5" />}
        title="검색 결과가 없습니다."
        description="다른 닉네임이나 메시지 내용으로 검색해보세요."
      />
    );
  } else {
    body = (
      <ul className="flex flex-col">
        {filtered!.map((c) => {
          // 지금 열어보고 있는 대화면 목록에도 굳이 안읽음 표시를 안 함(별도 상태 동기화 없이 렌더링 시점에 계산).
          const displayUnread = c.unread && c.id !== activeConversationId;
          const count = displayUnread ? Math.max(c.unreadCount ?? 0, 1) : 0;
          const active = c.id === activeConversationId;

          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => select(c)}
                aria-label={`${c.other.nickname || "회원"}님과의 대화${count > 0 ? `, 안 읽은 메시지 ${count}개` : ""}`}
                className={`flex min-h-[84px] w-full items-center gap-3 border-b border-slate-100 px-5 py-3 text-left transition-colors ${
                  active ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <Avatar url={c.other.avatarUrl} nickname={c.other.nickname || "?"} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[15px] font-semibold text-slate-900">{c.other.nickname || "회원"}</p>
                    <span
                      className={`flex-none text-xs ${displayUnread ? "font-semibold text-blue-600" : "text-slate-400"}`}
                    >
                      {formatTime(c.lastMessageAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p
                      className={`truncate text-[13px] ${
                        displayUnread ? "font-medium text-slate-800" : "text-slate-500"
                      } ${c.lastMessagePreview ? "" : "text-slate-400 italic"}`}
                    >
                      {c.lastMessagePreview ?? "아직 메시지가 없어요"}
                    </p>
                    {count > 0 ? (
                      <span className="flex h-5 min-w-5 flex-none items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white tabular-nums">
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-none px-5 pt-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="대화방 또는 사용자 검색하기"
            aria-label="대화방 또는 사용자 검색"
            disabled={!conversations || conversations.length === 0}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3.5 pl-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15 disabled:bg-slate-50"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{body}</div>

      <div className="flex flex-none items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <MessageCircle className="h-4 w-4 text-slate-400" />
          {conversations ? `총 ${conversations.length}개의 대화방` : "대화방"}
        </p>
        {composeButton}
      </div>
    </div>
  );
}
