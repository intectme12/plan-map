"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isAppBadgeSupported, setAppBadgeCount } from "@/lib/appBadge";
import { useMessageStream } from "@/hooks/useMessageStream";

type ConversationSummary = { unread: boolean };

// 앱 어디서든(트립 목록/상세/메시지함 등) 로그인 중이면 안읽은 대화 수를 브라우저 배지에
// 반영한다. 페이지별로 따로 세는 로직(MessageNavLink 등)과 조금 중복되지만, 이건 특정
// 페이지가 아니라 루트 레이아웃에 항상 떠 있어야 해서 자체적으로 초기값을 가져온다.
export function AppBadgeSync() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAppBadgeSupported()) return;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user: { id: string } | null } | null) => {
        if (data?.user) setUserId(data.user.id);
      });
  }, []);

  if (!userId) return null;
  return <AppBadgeSyncActive userId={userId} />;
}

function AppBadgeSyncActive({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  // 서버 상태를 다시 조회해서 정확한 값으로 맞춘다 — 증가만 추적하면 대화를 읽어서
  // 줄어드는 경우를 못 잡아서, 대화창에 들어가는 등 읽음 처리가 일어났을 만한 시점마다
  // 이걸로 다시 계산한다(아래 pathname 변경 시 호출).
  const refresh = useCallback(() => {
    fetch("/api/conversations")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: ConversationSummary[]) => setCount(list.filter((c) => c.unread).length));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    setAppBadgeCount(count);
  }, [count]);

  // 로그아웃 등으로 이 컴포넌트가 사라지면(언마운트 시에만) 배지를 지운다 — count가 바뀔
  // 때마다 지웠다 다시 세우면 안 되니 별도 effect로 분리.
  useEffect(() => {
    return () => setAppBadgeCount(0);
  }, []);

  useMessageStream((event) => {
    // 새 메시지가 도착하면 즉시 +1로 반응성 있게 보여주고, 어차피 페이지 이동 시
    // refresh()가 다시 정확한 값으로 맞춰준다.
    if (event.message.senderId !== userId) setCount((n) => n + 1);
  });

  return null;
}
