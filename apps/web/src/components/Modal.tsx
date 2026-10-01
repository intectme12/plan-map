"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const MAX_WIDTH_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  "3xl": "max-w-3xl",
} as const;

// 지금 열려 있는 Modal들(열린 순서) — 모달 위에 모달이 겹쳤을 때 ESC는 맨 위 하나만 닫는다
const openModalStack: symbol[] = [];

// ESC로 닫기. 모달 위에 PhotoLightbox처럼 자체 ESC 처리를 하는 레이어가 떠 있으면 그쪽이
// capture 단계에서 preventDefault 하므로(defaultPrevented) 여기서는 무시한다.
// 한글 입력 조합 중 ESC(조합 취소)나 date picker 등이 이미 처리한 ESC도 건드리지 않는다.
function useCloseOnEscape(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const id = Symbol("modal");
    openModalStack.push(id);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.isComposing || e.defaultPrevented) return;
      if (openModalStack[openModalStack.length - 1] !== id) return;
      e.preventDefault();
      onCloseRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      const idx = openModalStack.indexOf(id);
      if (idx >= 0) openModalStack.splice(idx, 1);
    };
  }, []);
}

// 모달이 열린 동안 뒤 페이지 스크롤을 막는다(LoginPopup과 같은 방식). overflow만 바꾸므로 닫으면
// 원래 스크롤 위치 그대로 돌아온다. 모달이 겹치면 열린 역순으로 닫히며 이전 값이 차례로 복원된다.
function useBodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// 열릴 때 대화상자로 포커스를 옮기고, Tab/Shift+Tab이 대화상자 밖으로 나가지 않게 순환시키며,
// 닫히면 팝업을 열었던 요소로 포커스를 돌려준다
function useFocusTrap(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      const root = ref.current;
      if (e.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!root.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, [ref]);
}

// 헤더/여백 없이 내용이 카드를 꽉 채우는 큰 팝업(프로필 팝업 등). 768px 미만에서는 전체 화면으로 바뀌고,
// 닫기 버튼·제목 표시는 내용 쪽이 직접 그린다(title은 스크린리더용 이름으로만 쓴다).
export function FullBleedModal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useCloseOnEscape(onClose);
  useBodyScrollLock();
  useFocusTrap(dialogRef);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 md:p-6"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white outline-none md:h-auto md:max-h-[90vh] md:max-w-[960px] md:rounded-2xl md:border md:border-slate-200 md:shadow-[0_20px_50px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

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
  useCloseOnEscape(onClose);
  const rich = icon != null || description != null || footer != null;
  // createPortal로 DOM은 body에 붙지만 React 이벤트는 여전히 "React 부모"로 버블링된다. 팝업을 연
  // 쪽이 <Link> 안(예: TripGridCard의 작성자 아바타)이면 배경 클릭이 그 링크까지 올라가 페이지가
  // 이동해버리므로, 배경 클릭은 닫기만 하고 전파를 끊는다(본문 클릭은 아래 dialog에서 이미 끊음).
  function onOverlayClick(e: React.MouseEvent) {
    e.stopPropagation();
    onClose();
  }

  if (rich) {
    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-6"
        onClick={onOverlayClick}
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
      onClick={onOverlayClick}
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
