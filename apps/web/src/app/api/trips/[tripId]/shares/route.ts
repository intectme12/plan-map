import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listTripShares, shareTrip } from "@/lib/services/trips";
import { shareTripSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId } = await params;
    const shares = await listTripShares(user.id, tripId);
    return NextResponse.json(shares);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId } = await params;
    const body = await request.json().catch(() => null);
    const { nickname } = shareTripSchema.parse(body);
    const share = await shareTrip(user.id, tripId, nickname);
    return NextResponse.json(share, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
