"use client";

import { useEffect, useRef } from "react";
import type { MessageStreamEvent } from "@/lib/messageEvents";

// /api/messages/stream(SSE)에 연결해서 새 메시지가 오면 onMessage로 알려준다.
// 컴포넌트당 하나씩 연결해도(받은편지함 배지 + 대화창 등) 브라우저 동시 연결 한도(6개)에
// 여유가 있어 문제없다 — 공유 컨텍스트로 하나만 열게 하는 건 지금 규모에선 조기 최적화.
export function useMessageStream(onMessage: (event: MessageStreamEvent) => void) {
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    const source = new EventSource("/api/messages/stream");
    source.addEventListener("message", (e) => {
      try {
        const data = JSON.parse(e.data) as MessageStreamEvent;
        onMessageRef.current(data);
      } catch {
        // 파싱 실패한 이벤트는 무시
      }
    });
    return () => source.close();
  }, []);
}
