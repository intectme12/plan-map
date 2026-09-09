import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConversationSummary, listMessages, markRead } from "@/lib/services/conversations";
import { ConversationView } from "./ConversationView";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { conversationId } = await params;
  const conversation = await getConversationSummary(user.id, conversationId);
  if (!conversation) notFound();

  const messages = await listMessages(user.id, conversationId);
  await markRead(user.id, conversationId);

  return (
    <ConversationView
      key={conversationId}
      conversationId={conversationId}
      currentUserId={user.id}
      other={conversation.other}
      initialMessages={messages}
    />
  );
}
