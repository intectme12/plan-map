"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useMessageStream } from "@/hooks/useMessageStream";

// MessageNavLink와 같은 실시간 안읽음 로직(useMessageStream)을 쓰지만 홈 헤더는 아이콘 전용
// UI라 별도로 둔다 — /trips 등 기존 화면 스타일은 건드리지 않기 위함.
export function HomeMessageLink({
  currentUserId,
  initialUnreadCount,
}: {
  currentUserId: string;
  initialUnreadCount: number;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useMessageStream((event) => {
    if (event.message.senderId !== currentUserId) {
      setUnreadCount((n) => n + 1);
    }
  });

  return (
    <Link
      href="/messages"
      aria-label="메시지"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
    >
      <MessageCircle className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
