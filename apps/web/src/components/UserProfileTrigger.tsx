"use client";

import { useState } from "react";
import { UserProfileModal } from "@/components/UserProfileModal";

// 회원(아바타/닉네임)을 누르면 /users/[nickname] 페이지로 이동하는 대신 프로필 팝업을 띄우는 버튼.
// 서버 컴포넌트(홈 카드, 알림 페이지 등)에서도 쓸 수 있게 열림 상태를 여기 안에 가둔다.
export function UserProfileTrigger({
  nickname,
  className,
  ariaLabel,
  onOpen,
  children,
}: {
  nickname: string;
  className?: string;
  ariaLabel?: string;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen?.();
          setOpen(true);
        }}
        aria-label={ariaLabel}
        className={`text-left ${className ?? ""}`}
      >
        {children}
      </button>
      {open ? <UserProfileModal nickname={nickname} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
