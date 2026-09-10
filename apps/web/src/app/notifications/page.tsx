import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications, markAllNotificationsRead } from "@/lib/services/notifications";
import { Avatar } from "@/components/Avatar";

function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function notificationText(type: string) {
  if (type === "FOLLOW") return "님이 팔로우하였습니다";
  return "새 알림이 있습니다";
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await listNotifications(user.id, 0);
  await markAllNotificationsRead(user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 py-8">
      <Link href="/trips" className="text-sm text-neutral-500 hover:underline">
        ← 내 여행계획
      </Link>

      <h1 className="text-xl font-bold">알림</h1>

      {notifications.length === 0 ? (
        <p className="text-sm text-neutral-500">아직 알림이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={`/users/${n.actor.nickname}`}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
              >
                <Avatar url={n.actor.avatarUrl} nickname={n.actor.nickname} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{n.actor.nickname}</span>
                    {notificationText(n.type)}
                  </p>
                  <p className="text-xs text-neutral-400">{formatDateTime(n.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
