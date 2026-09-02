import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listTrips, createTrip } from "@/lib/services/trips";
import { createTripSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return NextResponse.json(await listTrips(user.id));
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const data = createTripSchema.parse(body);
    const trip = await createTrip(user.id, data);
    return NextResponse.json(trip, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
