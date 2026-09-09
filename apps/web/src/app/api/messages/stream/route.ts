import { getCurrentUser } from "@/lib/auth";
import { subscribe, unsubscribe } from "@/lib/messageEvents";

// 캐시/정적 최적화 대상이 아님 — 매 요청마다 새 스트림을 열어야 한다.
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();
const HEARTBEAT_MS = 25_000;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let streamController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      subscribe(user.id, controller);
      controller.enqueue(encoder.encode(": connected\n\n"));
      // 25초마다 주석 라인을 보내 중간 프록시/로드밸런서가 유휴 연결로 보고 끊지 않게 한다.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);
    },
  });

  request.signal.addEventListener("abort", () => {
    if (heartbeat) clearInterval(heartbeat);
    if (streamController) {
      unsubscribe(user.id, streamController);
      try {
        streamController.close();
      } catch {
        // 이미 닫힌 경우 무시
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
