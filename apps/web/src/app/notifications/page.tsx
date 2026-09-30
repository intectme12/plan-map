import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications, markAllNotificationsRead } from "@/lib/services/notifications";
import { formatNotificationDate, notificationText, notificationHref } from "@/lib/notificationDisplay";
import { Avatar } from "@/components/Avatar";
import { UserProfileTrigger } from "@/components/UserProfileTrigger";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const notifications = await listNotifications(user.id, 0);
  await markAllNotificationsRead(user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← 홈
      </Link>

      <h1 className="text-xl font-bold">알림</h1>

      {notifications.length === 0 ? (
        <p className="text-sm text-neutral-500">아직 알림이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const href = notificationHref(n);
            const itemClass =
              "flex w-full items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50";
            const content = (
              <>
                <Avatar url={n.actor.avatarUrl} nickname={n.actor.nickname} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{n.actor.nickname}</span>
                    {notificationText(n)}
                  </p>
                  <p className="text-xs text-neutral-400">{formatNotificationDate(n.createdAt)}</p>
                </div>
              </>
            );
            return (
              <li key={n.id}>
                {/* 좋아요 알림은 내 여행계획으로 이동, 팔로우 알림은 상대 프로필 팝업 */}
                {href ? (
                  <Link href={href} className={itemClass}>
                    {content}
                  </Link>
                ) : (
                  <UserProfileTrigger nickname={n.actor.nickname} className={itemClass}>
                    {content}
                  </UserProfileTrigger>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
