"use client";

import { createContext, useContext, useMemo, useState } from "react";

type LoginPopupContextValue = {
  open: boolean;
  openPopup: () => void;
  closePopup: () => void;
};

const LoginPopupContext = createContext<LoginPopupContextValue | null>(null);

// 게스트 홈 화면 안에서 헤더의 "로그인" 버튼뿐 아니라 Hero 검색창, AI 배너 버튼처럼
// 서로 다른 위치의 트리거가 전부 같은 로그인 팝업 하나를 열 수 있도록 상태를 공유한다.
export function LoginPopupProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({ open, openPopup: () => setOpen(true), closePopup: () => setOpen(false) }),
    [open]
  );
  return <LoginPopupContext.Provider value={value}>{children}</LoginPopupContext.Provider>;
}

export function useLoginPopup() {
  const ctx = useContext(LoginPopupContext);
  if (!ctx) throw new Error("useLoginPopup은 LoginPopupProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
