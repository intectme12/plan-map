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

// 대화 상대 두 명(발신자 포함 — 다른 탭/기기 동기화용) 각자의 연결에 새 메시지를 밀어넣는다.
export function publishMessage(userIds: string[], event: MessageStreamEvent) {
  const payload = encoder.encode(`event: message\ndata: ${JSON.stringify(event)}\n\n`);
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
