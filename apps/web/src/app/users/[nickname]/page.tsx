import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/services/users";
import { listSharedTrips } from "@/lib/services/trips";
import { Avatar } from "@/components/Avatar";
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

  const trips = await listSharedTrips(undefined, 0, profile.id);

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
            {profile.createdAt.toLocaleDateString("ko-KR")} 가입 · 공유 중인 여행{" "}
            {profile._count.trips}개
          </p>
        </div>
      </header>

      <UserTripList userId={profile.id} initialTrips={trips} />
    </main>
  );
}
