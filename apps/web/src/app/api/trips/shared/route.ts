import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listSharedTrips } from "@/lib/services/trips";
import { sharedTripsQuerySchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const { q, cursor } = sharedTripsQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });
    const trips = await listSharedTrips(q, cursor);
    return NextResponse.json(trips);
  } catch (err) {
    return handleRouteError(err);
  }
}
