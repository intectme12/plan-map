"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { useLoginPopup } from "./LoginPopupContext";

// 헤더용 트리거 버튼. Hero 검색창/AI 배너처럼 다른 위치에서 팝업을 열 때는
// 버튼 없이 useLoginPopup().openPopup()만 직접 호출한다.
export function LoginTriggerButton() {
  const { openPopup } = useLoginPopup();
  return (
    <button
      type="button"
      onClick={openPopup}
      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
    >
      로그인
    </button>
  );
}

// 헤더에 backdrop-blur가 걸려있어 CSS containing block이 생기는 바람에, fixed 포지션 자식이
// 화면 전체가 아니라 헤더 높이(64px) 안에 갇혀버린다(Modal.tsx의 동일한 문제와 같은 원인) —
// document.body에 포탈로 그려서 헤더의 영향권을 벗어난다.
// 데스크톱은 우측 상단에, 모바일(md 미만)은 화면 전체를 덮는 모달로 — 뷰포트 판별 JS 없이
// 반응형 클래스만으로 두 레이아웃을 전환한다.
export function LoginPopupPanel() {
  const { open, closePopup } = useLoginPopup();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) closePopup();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePopup();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closePopup]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 md:items-start md:justify-end md:bg-transparent md:pt-[72px] md:pr-6">
      <div
        ref={panelRef}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl md:w-80"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-900">로그인</h2>
          <button
            type="button"
            onClick={closePopup}
            aria-label="닫기"
            className="text-neutral-400 hover:text-neutral-600"
          >
            ✕
          </button>
        </div>
        <LoginForm
          onSuccess={() => {
            closePopup();
            router.refresh();
          }}
        />
      </div>
    </div>,
    document.body
  );
}
