import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updatePlace, deletePlace } from "@/lib/services/places";
import { updatePlaceSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string; placeId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId, placeId } = await params;
    const body = await request.json().catch(() => null);
    const data = updatePlaceSchema.parse(body);
    await updatePlace(user.id, tripId, placeId, data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId, placeId } = await params;
    await deletePlace(user.id, tripId, placeId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
