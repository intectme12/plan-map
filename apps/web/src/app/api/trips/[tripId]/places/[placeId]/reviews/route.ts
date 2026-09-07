import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addReview } from "@/lib/services/reviews";
import { createReviewSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string; placeId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId, placeId } = await params;
    const body = await request.json().catch(() => null);
    const { content } = createReviewSchema.parse(body);

    const review = await addReview(user.id, tripId, placeId, content);
    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
