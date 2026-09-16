import Link from "next/link";
import { EditableAvatar } from "@/components/EditableAvatar";

const FALLBACK_GRADIENT = "linear-gradient(135deg, #0f4c81 0%, #2f6fed 45%, #38bdf8 75%, #fbbf24 100%)";

export function TripsProfileHero({
  nickname,
  avatarUrl,
  bio,
  followerCount,
  followingCount,
  backgroundImageUrl,
}: {
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  backgroundImageUrl: string | null;
}) {
  return (
    <section className="relative mt-6 overflow-hidden rounded-3xl">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={
          backgroundImageUrl
            ? { backgroundImage: `url(${backgroundImageUrl})` }
            : { backgroundImage: FALLBACK_GRADIENT }
        }
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

      <div className="relative flex items-center gap-4 px-6 py-8 sm:px-10 sm:py-10">
        <EditableAvatar url={avatarUrl} nickname={nickname} size={72} />
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white sm:text-2xl">{nickname}</h1>
          {bio ? <p className="mt-0.5 max-w-md truncate text-sm text-white/85">{bio}</p> : null}
          <p className="mt-2 flex gap-4 text-sm text-white/90">
            <Link href={`/users/${nickname}/followers`} className="hover:underline">
              팔로워 <span className="font-semibold">{followerCount}</span>
            </Link>
            <Link href={`/users/${nickname}/following`} className="hover:underline">
              팔로잉 <span className="font-semibold">{followingCount}</span>
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
