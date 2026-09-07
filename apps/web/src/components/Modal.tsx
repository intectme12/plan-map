"use client";

import { createPortal } from "react-dom";

const MAX_WIDTH_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

// 팝업 배경(오버레이) + 흰 카드 + 헤더(제목/닫기버튼)를 공유하는 셸.
// document.body에 직접 렌더링(createPortal)해서, 이 팝업을 여는 쪽 조상에 걸린 CSS
// transform이 fixed 자손의 기준점을 바꿔버려 팝업이 화면 가운데가 아니라 그 조상 안에
// 갇혀 보이는 문제(PhotoLightbox/ShareLinkModal에서 이미 겪었던 버그)를 원천 차단한다.
export function Modal({
  onClose,
  title,
  maxWidth = "md",
  scrollable = false,
  children,
}: {
  onClose: () => void;
  title: string;
  maxWidth?: keyof typeof MAX_WIDTH_CLASSES;
  scrollable?: boolean;
  children: React.ReactNode;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`flex w-full ${MAX_WIDTH_CLASSES[maxWidth]} flex-col gap-3 rounded-lg bg-white p-4 shadow-xl ${
          scrollable ? "max-h-[80vh] overflow-y-auto" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-neutral-400 hover:text-neutral-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
