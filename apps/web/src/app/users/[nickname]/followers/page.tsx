import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/services/users";
import { listFollowers } from "@/lib/services/follows";
import { FollowUserList } from "@/components/FollowUserList";

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { nickname: rawNickname } = await params;
  const nickname = decodeURIComponent(rawNickname);
  const profile = await getPublicProfile(nickname);
  if (!profile) notFound();

  const followers = await listFollowers(nickname, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <Link href={`/users/${nickname}`} className="text-sm text-neutral-500 hover:underline">
        ← {profile.nickname}
      </Link>

      <h1 className="text-xl font-bold">{profile.nickname}님의 팔로워</h1>

      <FollowUserList
        apiPath={`/api/users/${encodeURIComponent(nickname)}/followers`}
        initialUsers={followers}
        emptyMessage="아직 팔로워가 없습니다."
      />
    </main>
  );
}
