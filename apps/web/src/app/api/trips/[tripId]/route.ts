import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTrip, updateTrip, deleteTrip } from "@/lib/services/trips";
import { updateTripSchema } from "@/lib/validation";
import { unauthorized, notFound, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { tripId } = await params;
  const trip = await getTrip(user.id, tripId);
  if (!trip) return notFound("여행을 찾을 수 없습니다.");
  return NextResponse.json(trip);
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId } = await params;
    const body = await request.json().catch(() => null);
    const data = updateTripSchema.parse(body);
    const ok = await updateTrip(user.id, tripId, data);
    if (!ok) return notFound("여행을 찾을 수 없습니다.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { tripId } = await params;
  const ok = await deleteTrip(user.id, tripId);
  if (!ok) return notFound("여행을 찾을 수 없습니다.");
  return NextResponse.json({ ok: true });
}
