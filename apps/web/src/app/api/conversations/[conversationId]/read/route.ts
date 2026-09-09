import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markRead } from "@/lib/services/conversations";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ conversationId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { conversationId } = await params;
    await markRead(user.id, conversationId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
