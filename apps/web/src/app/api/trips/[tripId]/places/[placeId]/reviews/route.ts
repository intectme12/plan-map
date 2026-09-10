import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { upsertReview } from "@/lib/services/reviews";
import { createReviewSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string; placeId: string }> };

// 좌표 기준 upsert라 이미 이 장소에 내 후기가 있으면 수정으로 처리된다.
export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId, placeId } = await params;
    const body = await request.json().catch(() => null);
    const { rating, content } = createReviewSchema.parse(body);

    const review = await upsertReview(user.id, tripId, placeId, { rating, content });
    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
