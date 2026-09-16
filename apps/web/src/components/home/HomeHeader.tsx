import Link from "next/link";
import { Search } from "lucide-react";
import { HomeTopNav } from "./HomeTopNav";
import { HomeNotificationLink } from "./HomeNotificationLink";
import { HomeMessageLink } from "./HomeMessageLink";
import { ProfileMenu } from "./ProfileMenu";

export function HomeHeader({
  nickname,
  avatarUrl,
  isAdmin,
  unreadNotificationCount,
  unreadMessageCount,
  currentUserId,
  mapHref,
  aiPlanHref,
}: {
  nickname: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  unreadNotificationCount: number;
  unreadMessageCount: number;
  currentUserId: string;
  mapHref: string;
  aiPlanHref: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex flex-none items-center gap-1.5 text-lg font-bold text-neutral-900">
          <span className="text-blue-600">Triply</span>
        </Link>

        <div className="flex flex-1 items-center justify-between">
          <HomeTopNav mapHref={mapHref} aiPlanHref={aiPlanHref} />

          <div className="flex items-center gap-1.5">
            <Link
              href="/trips?tab=shared"
              aria-label="검색"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 sm:flex"
            >
              <Search className="h-5 w-5" />
            </Link>
            <HomeNotificationLink initialUnreadCount={unreadNotificationCount} />
            <HomeMessageLink currentUserId={currentUserId} initialUnreadCount={unreadMessageCount} />
            <div className="ml-1">
              <ProfileMenu nickname={nickname} avatarUrl={avatarUrl} isAdmin={isAdmin} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
