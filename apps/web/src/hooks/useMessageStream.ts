"use client";

import { useEffect, useRef } from "react";
import type { MessageStreamEvent, TypingStreamEvent, ReadStreamEvent } from "@/lib/messageEvents";

type Listener = {
  message: (event: MessageStreamEvent) => void;
  typing: (event: TypingStreamEvent) => void;
  read: (event: ReadStreamEvent) => void;
};

// 탭 하나에서 /api/messages/stream(SSE) 연결을 하나만 열고 이 훅을 쓰는 컴포넌트들(받은편지함 배지·홈 메시지 링크·
// 대화 목록·대화창)이 같이 쓴다. 예전엔 컴포넌트마다 연결을 따로 열어 한 화면에 최대 4개였는데, 서버가 사용자당
// 연결 수를 제한하게 되면서(docs/SECURITY_PLAN.md 4단계) 하나로 합쳤다. 마지막 사용자가 빠지면 연결을 닫는다.
const listeners = new Set<Listener>();
let source: EventSource | null = null;

function dispatch<K extends keyof Listener>(type: K, raw: string) {
  let data: Parameters<Listener[K]>[0];
  try {
    data = JSON.parse(raw);
  } catch {
    return; // 파싱 실패한 이벤트는 무시
  }
  for (const listener of listeners) (listener[type] as (event: typeof data) => void)(data);
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;
const RETRY_AFTER_REJECT_MS = 30_000;

function connect() {
  const es = new EventSource("/api/messages/stream");
  es.addEventListener("message", (e) => dispatch("message", e.data));
  es.addEventListener("typing", (e) => dispatch("typing", e.data));
  es.addEventListener("read", (e) => dispatch("read", e.data));
  // 네트워크가 잠깐 끊기면 브라우저가 알아서 다시 붙지만, 서버가 200이 아닌 응답(연결 수 초과 429·서버 혼잡 503 등)을
  // 주면 EventSource는 완전히 닫히고 재시도하지 않는다 — 그때는 잠시 뒤 직접 다시 연결한다.
  es.addEventListener("error", () => {
    if (es.readyState !== EventSource.CLOSED || source !== es) return;
    source = null;
    if (listeners.size > 0 && !retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (listeners.size > 0 && !source) source = connect();
      }, RETRY_AFTER_REJECT_MS);
    }
  });
  return es;
}

function attach(listener: Listener) {
  listeners.add(listener);
  if (!source && !retryTimer) source = connect();
}

function detach(listener: Listener) {
  listeners.delete(listener);
  if (listeners.size > 0) return;
  source?.close();
  source = null;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

// 새 메시지/타이핑/읽음 신호가 오면 콜백으로 알려준다.
export function useMessageStream(
  onMessage: (event: MessageStreamEvent) => void,
  onTyping?: (event: TypingStreamEvent) => void,
  onRead?: (event: ReadStreamEvent) => void
) {
  const onMessageRef = useRef(onMessage);
  const onTypingRef = useRef(onTyping);
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onMessageRef.current = onMessage;
    onTypingRef.current = onTyping;
    onReadRef.current = onRead;
  });

  useEffect(() => {
    const listener: Listener = {
      message: (event) => onMessageRef.current(event),
      typing: (event) => onTypingRef.current?.(event),
      read: (event) => onReadRef.current?.(event),
    };
    attach(listener);
    return () => detach(listener);
  }, []);
}
