import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deletePhoto } from "@/lib/services/photos";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string; placeId: string; photoId: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId, placeId, photoId } = await params;
    await deletePhoto(user.id, tripId, placeId, photoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
