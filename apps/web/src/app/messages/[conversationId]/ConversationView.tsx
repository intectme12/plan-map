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
  initialOtherLastReadAt,
}: {
  conversationId: string;
  currentUserId: string;
  other: OtherUser;
  initialMessages: Message[];
  initialOtherLastReadAt: string | Date | null;
}) {
  // 다른 대화로 이동하면 이 컴포넌트가 다시 마운트되도록 호출부([conversationId]/page.tsx)가
  // key={conversationId}를 준다 — 그래서 initialMessages가 그대로 초기값이 되고, 대화가
  // 바뀔 때마다 상태를 되돌리는 effect가 따로 필요 없다.
  const [messages, setMessages] = useState(initialMessages);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(initialMessages.length >= 30);
  const [lightboxKey, setLightboxKey] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherLastReadAt, setOtherLastReadAt] = useState(initialOtherLastReadAt);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, isTyping]);

  // 대화를 나가면(다른 대화로 이동/언마운트) 남아있는 타이머 정리
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useMessageStream(
    (event) => {
      if (event.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === event.message.id)) return prev;
        return [...prev, event.message];
      });
      if (event.message.senderId !== currentUserId) {
        fetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
        // 실제 메시지가 도착했으면 그 사람은 더 이상 "입력 중"이 아님
        setIsTyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    },
    (event) => {
      if (event.conversationId !== conversationId || event.userId === currentUserId) return;
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      // 4초 안에 다음 타이핑 신호가 안 오면 "입력 중" 표시를 지운다(상대가 멈췄다고 간주).
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 4000);
    },
    (event) => {
      if (event.conversationId !== conversationId || event.userId === currentUserId) return;
      setOtherLastReadAt(event.readAt);
    }
  );

  // KakaoTalk처럼 내가 보낸 메시지 중 가장 최근 것에만 "읽음"을 표시(전부에 달면 지저분함 —
  // 상대가 그 메시지를 읽었으면 그 이전 것들도 당연히 다 읽은 것이므로 충분).
  const lastMineMessageId = [...messages].reverse().find((m) => m.senderId === currentUserId)?.id;
  const otherLastReadAtMs = otherLastReadAt ? new Date(otherLastReadAt).getTime() : null;

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
          const showRead =
            mine &&
            m.id === lastMineMessageId &&
            otherLastReadAtMs !== null &&
            otherLastReadAtMs >= new Date(m.createdAt).getTime();
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
              <span className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                {showRead ? <span className="text-blue-500">읽음</span> : null}
                {formatTime(m.createdAt)}
              </span>
            </div>
          );
        })}
        {isTyping ? <p className="px-1 text-xs text-neutral-400">{other.nickname}님이 입력 중...</p> : null}
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
