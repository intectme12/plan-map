import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/services/notifications";
import { notificationsQuerySchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const { cursor } = notificationsQuerySchema.parse({
      cursor: searchParams.get("cursor") ?? undefined,
    });
    const notifications = await listNotifications(user.id, cursor);
    return NextResponse.json(notifications);
  } catch (err) {
    return handleRouteError(err);
  }
}
