import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listPlaces, createPlace } from "@/lib/services/places";
import { createPlaceSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId } = await params;
    return NextResponse.json(await listPlaces(user.id, tripId));
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
    const data = createPlaceSchema.parse(body);
    const place = await createPlace(user.id, tripId, data);
    return NextResponse.json(place, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
