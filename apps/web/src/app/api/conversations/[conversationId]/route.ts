import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getConversationSummary } from "@/lib/services/conversations";
import { unauthorized, notFound, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { conversationId } = await params;
    const summary = await getConversationSummary(user.id, conversationId);
    if (!summary) return notFound("대화를 찾을 수 없습니다.");

    return NextResponse.json(summary);
  } catch (err) {
    return handleRouteError(err);
  }
}
