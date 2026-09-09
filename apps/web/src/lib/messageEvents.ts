// 프로세스 메모리 안의 인메모리 pub/sub — 이 앱은 단일 Next.js 프로세스라 Redis 등 외부
// pub/sub 없이 이걸로 충분하다(docs/ARCHITECTURE.md 확정 결정). 여러 인스턴스로 수평 확장하면
// 이 방식으로는 인스턴스 간 메시지가 전달되지 않으니 그때 재검토할 것.
const subscribers = new Map<string, Set<ReadableStreamDefaultController>>();
const encoder = new TextEncoder();

export function subscribe(userId: string, controller: ReadableStreamDefaultController) {
  let set = subscribers.get(userId);
  if (!set) {
    set = new Set();
    subscribers.set(userId, set);
  }
  set.add(controller);
}

export function unsubscribe(userId: string, controller: ReadableStreamDefaultController) {
  const set = subscribers.get(userId);
  if (!set) return;
  set.delete(controller);
  if (set.size === 0) subscribers.delete(userId);
}

export type MessageStreamEvent = {
  type: "message";
  conversationId: string;
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string | null;
    imageKey: string | null;
    createdAt: string;
  };
};

// 타이핑 중 표시는 DB에 저장하지 않는 순간적인 신호라 메시지와 다른 이벤트 이름(typing)으로 보낸다.
export type TypingStreamEvent = {
  type: "typing";
  conversationId: string;
  userId: string; // 지금 입력 중인 사람
};

// 상대가 읽음 처리(markRead)할 때마다 보내서, 내가 보낸 메시지 옆에 "읽음"을 실시간으로 띄운다.
export type ReadStreamEvent = {
  type: "read";
  conversationId: string;
  userId: string; // 읽은 사람
  readAt: string;
};

function broadcast(userIds: string[], eventName: string, data: unknown) {
  const payload = encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  for (const userId of userIds) {
    const set = subscribers.get(userId);
    if (!set) continue;
    for (const controller of set) {
      try {
        controller.enqueue(payload);
      } catch {
        // 연결이 이미 끊긴 경우 — abort 핸들러가 곧 unsubscribe 처리하므로 여기선 무시
      }
    }
  }
}

// 대화 상대 두 명(발신자 포함 — 다른 탭/기기 동기화용) 각자의 연결에 새 메시지를 밀어넣는다.
export function publishMessage(userIds: string[], event: MessageStreamEvent) {
  broadcast(userIds, "message", event);
}

// 타이핑 신호는 받는 사람에게만 보낸다(발신자 본인은 알 필요 없음).
export function publishTyping(userIds: string[], event: TypingStreamEvent) {
  broadcast(userIds, "typing", event);
}

// 읽음 신호도 상대(내가 읽은 메시지를 보낸 사람)에게만 보낸다.
export function publishRead(userIds: string[], event: ReadStreamEvent) {
  broadcast(userIds, "read", event);
}
