import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { copyTrip } from "@/lib/services/trips";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId } = await params;
    const trip = await copyTrip(user.id, tripId);
    return NextResponse.json(trip, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
