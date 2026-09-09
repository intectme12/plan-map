import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listConversations } from "@/lib/services/conversations";
import { ConversationListPane } from "./ConversationListPane";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const conversations = await listConversations(user.id);

  return (
    <main className="flex h-screen w-full">
      <aside className="flex w-full max-w-xs flex-none flex-col border-r border-neutral-200">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h1 className="text-lg font-bold">메시지</h1>
          <Link href="/trips" className="text-sm text-neutral-500 hover:underline">
            여행계획으로
          </Link>
        </div>
        <ConversationListPane initialConversations={conversations} currentUserId={user.id} />
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">{children}</section>
    </main>
  );
}
