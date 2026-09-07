import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { unshareTrip } from "@/lib/services/trips";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string; userId: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId, userId } = await params;
    await unshareTrip(user.id, tripId, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
