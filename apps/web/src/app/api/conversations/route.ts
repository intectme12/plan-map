import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateConversation, listConversations } from "@/lib/services/conversations";
import { createConversationSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const conversations = await listConversations(user.id);
    return NextResponse.json(conversations);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const { userId } = createConversationSchema.parse(body);

    const conversation = await getOrCreateConversation(user.id, userId);
    return NextResponse.json(conversation, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
