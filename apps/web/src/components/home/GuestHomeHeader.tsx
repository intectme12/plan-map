import Link from "next/link";
import { LoginTriggerButton, LoginPopupPanel } from "@/components/auth/LoginPopup";

// 로그인 화면 전용 헤더 — 비로그인 상태에서는 지도/둘러보기/내 여행계획 등 어차피 로그인해야
// 쓸 수 있는 메뉴를 보여주지 않고, 로고 + 로그인 버튼만 둔다.
export function GuestHomeHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex flex-none items-center gap-1.5 text-lg font-bold text-neutral-900">
          <span className="text-blue-600">Triply</span>
        </Link>

        <div className="relative">
          <LoginTriggerButton />
          <LoginPopupPanel />
        </div>
      </div>
    </header>
  );
}
