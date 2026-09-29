import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { countUnreadConversations } from "@/lib/services/conversations";
import { countUnreadNotifications } from "@/lib/services/notifications";
import { getFeaturedTripForHome } from "@/lib/services/trips";
import { HomeHeader } from "@/components/home/HomeHeader";
import { AccountSettings, type SettingsTab } from "./AccountSettings";

const TABS: SettingsTab[] = ["profile", "account", "security", "privacy"];

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { tab } = await searchParams;
  const initialTab = TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : "profile";

  const [unreadMessageCount, unreadNotificationCount, featuredTrip, accounts] = await Promise.all([
    countUnreadConversations(user.id),
    countUnreadNotifications(user.id),
    getFeaturedTripForHome(user.id),
    // 로그인 방식 표시 + 비밀번호 변경 가능 여부(이메일 가입 계정 = providerId "credential")
    prisma.account.findMany({ where: { userId: user.id }, select: { providerId: true } }),
  ]);
  const mapHref = featuredTrip ? `/trips/${featuredTrip.id}` : "/trips";
  const aiPlanHref = featuredTrip ? `/trips/${featuredTrip.id}/import` : "/trips";

  return (
    <main className="min-h-screen bg-slate-50">
      <HomeHeader
        nickname={user.nickname}
        avatarUrl={user.avatarUrl}
        isAdmin={isAdmin(user)}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={unreadMessageCount}
        currentUserId={user.id}
        mapHref={mapHref}
        aiPlanHref={aiPlanHref}
      />
      <AccountSettings
        initialTab={initialTab}
        user={{
          email: user.email,
          nickname: user.nickname,
          bio: user.bio ?? "",
          avatarUrl: user.avatarUrl,
          showTripsOnProfile: user.showTripsOnProfile,
        }}
        providers={[...new Set(accounts.map((a) => a.providerId))]}
      />
    </main>
  );
}
