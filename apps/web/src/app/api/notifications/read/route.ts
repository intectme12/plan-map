import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/services/notifications";
import { unauthorized, handleRouteError } from "@/lib/http";

// body 없이 호출하면 전체 읽음 처리(기존 동작), { id }를 넘기면 그 알림 하나만 읽음 처리한다
// (상단 알림 팝업에서 개별 알림을 클릭해 이동할 때 사용).
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : undefined;

    if (id) {
      await markNotificationRead(user.id, id);
    } else {
      await markAllNotificationsRead(user.id);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
