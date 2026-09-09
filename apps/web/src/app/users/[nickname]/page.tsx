import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/services/users";
import { listSharedTrips } from "@/lib/services/trips";
import { getFollowState } from "@/lib/services/follows";
import { Avatar } from "@/components/Avatar";
import { SendMessageButton } from "@/components/SendMessageButton";
import { FollowButton } from "@/components/FollowButton";
import { UserTripList } from "./UserTripList";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { nickname: rawNickname } = await params;
  // Next.js가 [nickname] 동적 세그먼트의 비-ASCII(한글 등) 값을 percent-encoding된 상태 그대로 넘겨줘서 직접 디코딩해야 한다.
  const nickname = decodeURIComponent(rawNickname);
  const profile = await getPublicProfile(nickname);
  if (!profile) notFound();

  const isOwnProfile = profile.id === user.id;
  const canSeeTrips = isOwnProfile || profile.showTripsOnProfile;
  const [trips, followState] = await Promise.all([
    canSeeTrips ? listSharedTrips(undefined, 0, profile.id, user.id) : Promise.resolve([]),
    getFollowState(user.id, profile.id),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <Link href="/trips?tab=users" className="text-sm text-neutral-500 hover:underline">
        ← 회원검색
      </Link>

      <header className="flex items-center gap-4">
        <Avatar url={profile.avatarUrl} nickname={profile.nickname} size={72} />
        <div>
          <h1 className="text-xl font-bold">{profile.nickname}</h1>
          {profile.bio ? <p className="text-sm text-neutral-600">{profile.bio}</p> : null}
          <p className="text-xs text-neutral-400">
            {profile.createdAt.toLocaleDateString("ko-KR")} 가입
            {canSeeTrips ? ` · 공유 중인 여행 ${profile._count.trips}개` : null}
          </p>
          <p className="mt-1 flex gap-3 text-sm">
            <Link href={`/users/${nickname}/followers`} className="hover:underline">
              팔로워 <span className="font-semibold">{followState.followerCount}</span>
            </Link>
            <Link href={`/users/${nickname}/following`} className="hover:underline">
              팔로잉 <span className="font-semibold">{followState.followingCount}</span>
            </Link>
          </p>
        </div>
        {isOwnProfile ? null : (
          <div className="ml-auto flex flex-none items-center gap-2">
            <FollowButton
              nickname={profile.nickname}
              initialIsFollowing={followState.isFollowing}
              className="h-auto rounded-md px-3 py-1.5 text-xs"
            />
            <SendMessageButton userId={profile.id} className="h-auto flex-none rounded-md px-3 py-1.5 text-xs" />
          </div>
        )}
      </header>

      {canSeeTrips ? (
        <UserTripList userId={profile.id} initialTrips={trips} />
      ) : (
        <p className="text-sm text-neutral-500">이 회원은 여행 목록을 비공개로 설정했습니다.</p>
      )}
    </main>
  );
}
