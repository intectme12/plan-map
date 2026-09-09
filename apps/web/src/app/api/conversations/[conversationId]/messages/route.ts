import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listMessages, sendMessage } from "@/lib/services/conversations";
import { messagesQuerySchema, sendMessageSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ conversationId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const { before } = messagesQuerySchema.parse({ before: searchParams.get("before") ?? undefined });

    const messages = await listMessages(user.id, conversationId, before);
    return NextResponse.json(messages);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { conversationId } = await params;
    const formData = await request.formData().catch(() => null);
    const { content } = sendMessageSchema.parse({
      content: (formData?.get("content") as string | null) ?? undefined,
    });
    const imageEntry = formData?.get("image");
    const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : undefined;

    const message = await sendMessage(user.id, conversationId, { content, imageFile });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
