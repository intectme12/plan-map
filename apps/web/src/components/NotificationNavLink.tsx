import Link from "next/link";

// /trips 헤더의 "메시지"(MessageNavLink.tsx)와 같은 자리에 붙는 알림 진입점 + 안읽음 배지.
// 실시간 업데이트는 안 하고(팔로우는 메시지만큼 빈번하지 않음) 서버가 내려준 초기 카운트만
// 보여준다 — /notifications에 들어가면 전부 읽음 처리되고 다음 방문 때 다시 정확해진다.
export function NotificationNavLink({
  initialUnreadCount,
  className,
}: {
  initialUnreadCount: number;
  className?: string;
}) {
  return (
    <Link
      href="/notifications"
      className={
        className ??
        "relative rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
      }
    >
      알림
      {initialUnreadCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {initialUnreadCount > 9 ? "9+" : initialUnreadCount}
        </span>
      ) : null}
    </Link>
  );
}
