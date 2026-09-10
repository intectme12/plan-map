import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { listTrips } from "@/lib/services/trips";
import { listConversations } from "@/lib/services/conversations";
import { getPublicProfile } from "@/lib/services/users";
import { getFollowState } from "@/lib/services/follows";
import { EditableAvatar } from "@/components/EditableAvatar";
import { LogoutButton } from "@/components/LogoutButton";
import { MessageNavLink } from "@/components/MessageNavLink";
import { TripsTabs } from "./TripsTabs";

export default async function TripsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [trips, conversations, profile, followState] = await Promise.all([
    listTrips(user.id),
    listConversations(user.id),
    getPublicProfile(user.nickname),
    getFollowState(user.id, user.id),
  ]);
  const unreadCount = conversations.filter((c) => c.unread).length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-end gap-2">
        {isAdmin(user) ? (
          <Link
            href="/admin"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            관리자
          </Link>
        ) : null}
        <MessageNavLink currentUserId={user.id} initialUnreadCount={unreadCount} />
        <LogoutButton />
      </div>

      <header className="flex items-center gap-4">
        <EditableAvatar url={profile?.avatarUrl ?? null} nickname={user.nickname} size={72} />
        <div>
          <h1 className="text-xl font-bold">{user.nickname}</h1>
          {profile?.bio ? <p className="text-sm text-neutral-600">{profile.bio}</p> : null}
          <p className="mt-1 flex gap-3 text-sm">
            <Link href={`/users/${user.nickname}/followers`} className="hover:underline">
              팔로워 <span className="font-semibold">{followState.followerCount}</span>
            </Link>
            <Link href={`/users/${user.nickname}/following`} className="hover:underline">
              팔로잉 <span className="font-semibold">{followState.followingCount}</span>
            </Link>
          </p>
        </div>
        <Link
          href="/account"
          className="ml-auto flex-none rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
        >
          프로필 편집
        </Link>
      </header>

      <TripsTabs trips={trips} />
    </main>
  );
}
