import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteReview } from "@/lib/services/reviews";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string; placeId: string; reviewId: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId, placeId, reviewId } = await params;
    await deleteReview(user.id, tripId, placeId, reviewId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
