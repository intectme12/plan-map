"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useMessageStream } from "@/hooks/useMessageStream";
import type { OtherUser } from "./MessagesPanelProvider";

export type ConversationSummary = {
  id: string;
  other: OtherUser;
  lastMessageAt: string | Date;
  lastMessagePreview: string | null;
  unread: boolean;
};

function formatTime(value: string | Date) {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function ConversationListPanel({
  currentUserId,
  activeConversationId,
  onSelect,
}: {
  currentUserId: string;
  activeConversationId: string | null;
  onSelect: (conversation: ConversationSummary) => void;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/conversations")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ConversationSummary[]) => setConversations(data));
  }, []);

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

      const updated: ConversationSummary = {
        ...existing,
        lastMessageAt: event.message.createdAt,
        lastMessagePreview: event.message.content ?? "사진",
        unread: !isMine && !isOpen,
      };
      const rest = prev.filter((c) => c.id !== event.conversationId);
      return [updated, ...rest];
    });
  });

  if (conversations === null) {
    return <p className="p-4 text-center text-sm text-neutral-400">불러오는 중...</p>;
  }

  if (conversations.length === 0) {
    return (
      <p className="p-4 text-sm text-neutral-500">
        아직 대화가 없습니다. 다른 회원 프로필에서 &quot;메시지 보내기&quot;로 시작해보세요.
      </p>
    );
  }

  return (
    <ul className="flex flex-1 flex-col overflow-y-auto">
      {conversations.map((c) => {
        // 지금 열어보고 있는 대화면 목록에도 굳이 안읽음 표시를 안 함(별도 상태 동기화 없이 렌더링 시점에 계산).
        const displayUnread = c.unread && c.id !== activeConversationId;

        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              className={`flex w-full items-center gap-3 border-b border-neutral-100 px-4 py-3 text-left hover:bg-neutral-50 ${
                c.id === activeConversationId ? "bg-neutral-100" : ""
              }`}
            >
              <Avatar url={c.other.avatarUrl} nickname={c.other.nickname || "?"} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${displayUnread ? "font-bold" : "font-semibold"}`}>
                    {c.other.nickname || "회원"}
                  </p>
                  <span className="flex-none text-xs text-neutral-400">{formatTime(c.lastMessageAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`truncate text-sm ${displayUnread ? "font-semibold text-neutral-900" : "text-neutral-500"}`}
                  >
                    {c.lastMessagePreview ?? ""}
                  </p>
                  {displayUnread ? <span className="h-2 w-2 flex-none rounded-full bg-blue-600" /> : null}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
