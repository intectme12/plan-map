"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const MAX_WIDTH_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  "3xl": "max-w-3xl",
} as const;

// 팝업 배경(오버레이) + 흰 카드 + 헤더(제목/닫기버튼)를 공유하는 셸.
// document.body에 직접 렌더링(createPortal)해서, 이 팝업을 여는 쪽 조상에 걸린 CSS
// transform이 fixed 자손의 기준점을 바꿔버려 팝업이 화면 가운데가 아니라 그 조상 안에
// 갇혀 보이는 문제(PhotoLightbox/ShareLinkModal에서 이미 겪었던 버그)를 원천 차단한다.
//
// icon/description/footer 중 하나라도 넘기면 "큰 폼" 레이아웃(아이콘+제목+부제목 헤더,
// 본문만 스크롤, 구분선 아래 고정 하단)으로 그린다. 안 넘기는 기존 팝업들은 모양 그대로.
export function Modal({
  onClose,
  title,
  maxWidth = "md",
  scrollable = false,
  icon,
  description,
  footer,
  children,
}: {
  onClose: () => void;
  title: string;
  maxWidth?: keyof typeof MAX_WIDTH_CLASSES;
  scrollable?: boolean;
  icon?: React.ReactNode;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const rich = icon != null || description != null || footer != null;

  if (rich) {
    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-6"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`flex max-h-[calc(100dvh-1.5rem)] w-full ${MAX_WIDTH_CLASSES[maxWidth]} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] sm:max-h-[calc(100dvh-3rem)]`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-none items-start gap-3 px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
            {icon ? (
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-xl font-bold text-slate-900 sm:text-[22px]">
                {title}
              </h2>
              {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="-mt-1 -mr-2 flex h-10 w-10 flex-none items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7">{children}</div>

          {footer ? (
            <div className="flex flex-none justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-7">
              {footer}
            </div>
          ) : null}
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex w-full ${MAX_WIDTH_CLASSES[maxWidth]} flex-col gap-3 rounded-lg bg-white p-4 shadow-xl ${
          scrollable ? "max-h-[80vh] overflow-y-auto" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-sm font-bold">{title}</h2>
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
