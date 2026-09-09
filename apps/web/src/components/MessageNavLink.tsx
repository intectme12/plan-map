"use client";

import Link from "next/link";
import { useState } from "react";
import { useMessageStream } from "@/hooks/useMessageStream";

// /trips 헤더의 "내 정보"/"로그아웃"과 같은 줄에 붙는 메시지 진입점 + 안읽음 배지.
// 정확한 실시간 카운트 동기화(다른 탭에서 읽음 처리 등)까지는 안 하고, 서버가 내려준 초기
// 카운트에 실시간으로 도착한 만큼만 더하는 정도로 단순하게 간다 — 배지는 "새 걸 확인하라"는
// 신호면 충분하고, 정확한 값은 어차피 /messages에 들어가면 다시 맞춰짐.
export function MessageNavLink({
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
      className="relative rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
    >
      메시지
      {unreadCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
