import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { setTripCoverPhoto, removeTripCoverPhoto } from "@/lib/services/trips";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId } = await params;
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    const trip = await setTripCoverPhoto(user.id, tripId, file);
    return NextResponse.json(trip);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId } = await params;
    await removeTripCoverPhoto(user.id, tripId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
