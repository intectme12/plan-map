import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/services/notifications";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
