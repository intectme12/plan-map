"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useMessageStream } from "@/hooks/useMessageStream";
import { useMessagesPanel } from "@/components/messages/MessagesPanelProvider";

// 클릭하면 더 이상 /messages로 이동하지 않고, 화면 오른쪽에 뜨는 메시지 패널(MessagesPanel)을 연다.
export function HomeMessageLink({
  currentUserId,
  initialUnreadCount,
}: {
  currentUserId: string;
  initialUnreadCount: number;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const { toggle } = useMessagesPanel();

  useMessageStream((event) => {
    if (event.message.senderId !== currentUserId) {
      setUnreadCount((n) => n + 1);
    }
  });

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="메시지"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
    >
      <MessageCircle className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
