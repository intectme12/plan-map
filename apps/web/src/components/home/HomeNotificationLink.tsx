import Link from "next/link";
import { Bell } from "lucide-react";

// NotificationNavLink(트립 페이지 헤더용, 텍스트 버튼)와 같은 데이터를 쓰지만 홈 헤더는
// 아이콘 전용 UI라 별도 컴포넌트로 둔다 — /trips 등 기존 화면 스타일은 건드리지 않기 위함.
export function HomeNotificationLink({ initialUnreadCount }: { initialUnreadCount: number }) {
  return (
    <Link
      href="/notifications"
      aria-label="알림"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
    >
      <Bell className="h-5 w-5" />
      {initialUnreadCount > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {initialUnreadCount > 9 ? "9+" : initialUnreadCount}
        </span>
      ) : null}
    </Link>
  );
}
