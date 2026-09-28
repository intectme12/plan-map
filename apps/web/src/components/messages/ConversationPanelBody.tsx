"use client";

import { useEffect, useState } from "react";
import { ConversationView } from "./ConversationView";
import { useMessagesPanel, type OtherUser } from "./MessagesPanelProvider";

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imageKey: string | null;
  createdAt: string | Date;
};

type LoadedConversation = {
  other: OtherUser;
  messages: Message[];
  otherLastReadAt: string | null;
};

// 부모(MessagesPanel.tsx)가 key={conversationId}로 렌더링한다 — 대화를 바꾸면 이 컴포넌트가
// 통째로 다시 마운트되므로, 대화 전환 시 이전 상태를 지우는 effect를 따로 둘 필요가 없다.
export function ConversationPanelBody({
  conversationId,
  other,
  currentUserId,
}: {
  conversationId: string;
  other: OtherUser | undefined;
  currentUserId: string;
}) {
  const [loaded, setLoaded] = useState<LoadedConversation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { setActiveOther } = useMessagesPanel();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 목록에서 넘어온 경우엔 이미 other 정보가 있으니 요약 요청을 건너뛴다.
      const summaryPromise = other
        ? Promise.resolve({ other, otherLastReadAt: null as string | null })
        : fetch(`/api/conversations/${conversationId}`).then((res) => (res.ok ? res.json() : null));

      const [summary, messagesRes] = await Promise.all([
        summaryPromise,
        fetch(`/api/conversations/${conversationId}/messages`),
      ]);
      if (cancelled) return;

      if (!summary || !messagesRes.ok) {
        setNotFound(true);
        return;
      }

      const messages: Message[] = await messagesRes.json();
      if (cancelled) return;

      setLoaded({
        other: summary.other,
        messages,
        otherLastReadAt: summary.otherLastReadAt ?? null,
      });
      // other 없이(SendMessageButton 등) 열린 경우 패널 헤더의 아바타/닉네임을 채워 넣는다.
      if (!other) setActiveOther(conversationId, summary.other);
      fetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, other, setActiveOther]);

  if (notFound) {
    return <p className="flex-1 p-4 text-center text-sm text-neutral-400">대화를 찾을 수 없습니다.</p>;
  }

  if (!loaded) {
    return <p className="flex-1 p-4 text-center text-sm text-neutral-400">불러오는 중...</p>;
  }

  return (
    <ConversationView
      key={conversationId}
      conversationId={conversationId}
      currentUserId={currentUserId}
      other={loaded.other}
      initialMessages={loaded.messages}
      initialOtherLastReadAt={loaded.otherLastReadAt}
    />
  );
}
