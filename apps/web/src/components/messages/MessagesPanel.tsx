"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useMessagesPanel } from "./MessagesPanelProvider";
import { ConversationListPanel, type ConversationSummary } from "./ConversationListPanel";
import { ConversationPanelBody } from "./ConversationPanelBody";

// 인스타그램 DM/카카오톡 웹처럼 화면 오른쪽에서 열고 닫는 비모달 패널. Modal.tsx와 같은 이유로
// document.body에 포탈 렌더링한다 — 조상 요소에 걸린 CSS transform이 fixed 포지셔닝의 기준점을
// 바꿔버려 패널이 화면 오른쪽이 아니라 그 조상 안에 갇혀 보이는 문제를 피하기 위함.
export function MessagesPanel() {
  const { state, currentUserId, openConversation, openList, close } = useMessagesPanel();

  useEffect(() => {
    if (!state.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [state.open, close]);

  if (typeof document === "undefined" || !currentUserId) return null;

  const view = state.open && state.conversationId ? "conversation" : "list";

  function onSelectConversation(c: ConversationSummary) {
    openConversation(c.id, c.other);
  }

  return createPortal(
    <div
      className={`fixed right-0 top-0 z-40 flex h-full w-full flex-col border-l border-neutral-200 bg-white shadow-2xl transition-transform duration-200 ease-out sm:w-[380px] ${
        state.open ? "translate-x-0" : "translate-x-full"
      }`}
      role="dialog"
      aria-label="메시지"
      aria-hidden={!state.open}
    >
      <div className="flex flex-none items-center gap-2 border-b border-neutral-200 px-4 py-3">
        {view === "conversation" ? (
          <button
            type="button"
            onClick={openList}
            aria-label="목록으로"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}

        {view === "conversation" && state.open && state.conversationId && state.other ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar url={state.other.avatarUrl} nickname={state.other.nickname} size={28} />
            <p className="truncate text-sm font-semibold">{state.other.nickname}</p>
          </div>
        ) : (
          <p className="flex-1 text-base font-bold">메시지</p>
        )}

        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {!state.open ? null : view === "conversation" && state.conversationId ? (
          <ConversationPanelBody
            key={state.conversationId}
            conversationId={state.conversationId}
            other={state.other}
            currentUserId={currentUserId}
          />
        ) : (
          <ConversationListPanel
            currentUserId={currentUserId}
            activeConversationId={state.conversationId}
            onSelect={onSelectConversation}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
