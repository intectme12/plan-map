import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseTripText } from "@/lib/services/aiImport";
import { aiParseRequestSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId } = await params;
    const body = await request.json().catch(() => null);
    const { text } = aiParseRequestSchema.parse(body);
    const candidates = await parseTripText(user.id, tripId, text);
    return NextResponse.json({ candidates });
  } catch (err) {
    return handleRouteError(err);
  }
}
