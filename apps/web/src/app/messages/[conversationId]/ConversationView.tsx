"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { PhotoLightbox } from "@/app/trips/[tripId]/PhotoLightbox";
import { useMessageStream } from "@/hooks/useMessageStream";
import { MessageComposer } from "./MessageComposer";

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imageKey: string | null;
  createdAt: string | Date;
};

type OtherUser = { id: string; nickname: string; avatarUrl: string | null };

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function ConversationView({
  conversationId,
  currentUserId,
  other,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  other: OtherUser;
  initialMessages: Message[];
}) {
  // 다른 대화로 이동하면 이 컴포넌트가 다시 마운트되도록 호출부([conversationId]/page.tsx)가
  // key={conversationId}를 준다 — 그래서 initialMessages가 그대로 초기값이 되고, 대화가
  // 바뀔 때마다 상태를 되돌리는 effect가 따로 필요 없다.
  const [messages, setMessages] = useState(initialMessages);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(initialMessages.length >= 30);
  const [lightboxKey, setLightboxKey] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useMessageStream((event) => {
    if (event.conversationId !== conversationId) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === event.message.id)) return prev;
      return [...prev, event.message];
    });
    if (event.message.senderId !== currentUserId) {
      fetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
    }
  });

  async function loadOlder() {
    if (messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0];
    const res = await fetch(
      `/api/conversations/${conversationId}/messages?before=${encodeURIComponent(
        new Date(oldest.createdAt).toISOString()
      )}`
    );
    setLoadingOlder(false);
    if (!res.ok) return;
    const older: Message[] = await res.json();
    setHasMoreOlder(older.length >= 30);
    setMessages((prev) => [...older, ...prev]);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
        <Avatar url={other.avatarUrl} nickname={other.nickname} size={36} />
        <p className="font-semibold">{other.nickname}</p>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {hasMoreOlder ? (
          <button
            type="button"
            onClick={loadOlder}
            disabled={loadingOlder}
            className="self-center rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
          >
            {loadingOlder ? "불러오는 중..." : "이전 메시지 더 보기"}
          </button>
        ) : null}

        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`flex max-w-[70%] flex-col gap-1 rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-900"
                }`}
              >
                {m.imageKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageKey}
                    alt=""
                    onClick={() => setLightboxKey(m.imageKey)}
                    className="max-h-60 max-w-full cursor-pointer rounded-lg object-cover"
                  />
                ) : null}
                {m.content ? <p className="whitespace-pre-wrap break-words">{m.content}</p> : null}
              </div>
              <span className="mt-0.5 text-xs text-neutral-400">{formatTime(m.createdAt)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        conversationId={conversationId}
        onSent={() => {
          fetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
        }}
      />

      {lightboxKey ? (
        <PhotoLightbox
          photos={[{ id: lightboxKey, storageKey: lightboxKey }]}
          index={0}
          onClose={() => setLightboxKey(null)}
          onNavigate={() => {}}
        />
      ) : null}
    </div>
  );
}
