import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listTrips, createTrip } from "@/lib/services/trips";
import { createTripSchema } from "@/lib/validation";
import { unauthorized, handleRouteError, readJsonBody } from "@/lib/http";

// 클라이언트가 만든 UUID 등 — 형식이 이상하면 무시하고 키 없이 처리(기존 호출과 호환)
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return NextResponse.json(await listTrips(user.id));
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await readJsonBody(request);
    const data = createTripSchema.parse(body);
    const header = request.headers.get("idempotency-key")?.trim();
    const idempotencyKey = header && IDEMPOTENCY_KEY_PATTERN.test(header) ? header : undefined;

    const { trip, created } = await createTrip(user, data, idempotencyKey);
    return NextResponse.json(trip, { status: created ? 201 : 200 });
  } catch (err) {
    return handleRouteError(err);
  }
}
