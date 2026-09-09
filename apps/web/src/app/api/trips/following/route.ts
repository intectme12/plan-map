import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listFollowingTrips } from "@/lib/services/trips";
import { followingTripsQuerySchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const { cursor } = followingTripsQuerySchema.parse({
      cursor: searchParams.get("cursor") ?? undefined,
    });
    const trips = await listFollowingTrips(cursor, user.id);
    return NextResponse.json(trips);
  } catch (err) {
    return handleRouteError(err);
  }
}
