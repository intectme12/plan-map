import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteReview } from "@/lib/services/reviews";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ reviewId: string }> };

// 후기는 이제 트립/장소에 종속되지 않으므로 본인 작성 여부만 확인하고 지운다(deleteReview 참고).
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { reviewId } = await params;
    await deleteReview(user.id, reviewId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
