"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, MessageCircle, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useMessagesPanel } from "./MessagesPanelProvider";
import { ConversationListPanel, type ConversationSummary } from "./ConversationListPanel";
import { ConversationPanelBody } from "./ConversationPanelBody";
import { NewMessagePicker } from "./NewMessagePicker";

const iconButton =
  "flex h-10 w-10 flex-none items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700";

// 인스타그램 DM/카카오톡 웹처럼 화면 오른쪽에서 열고 닫는 비모달 패널. Modal.tsx와 같은 이유로
// document.body에 포탈 렌더링한다 — 조상 요소에 걸린 CSS transform이 fixed 포지셔닝의 기준점을
// 바꿔버려 패널이 화면 오른쪽이 아니라 그 조상 안에 갇혀 보이는 문제를 피하기 위함.
export function MessagesPanel() {
  const { state, currentUserId, openConversation, openList, close } = useMessagesPanel();
  // "새 메시지 작성" 화면 — 대화방 목록 위에서만 여닫는 패널 내부 화면이라 Provider 상태가 아니라 여기서 관리한다.
  // 패널을 닫거나 대화를 열면(=목록 화면이 아니게 되면) 다음에 열 때 목록부터 보이도록 렌더 중에 초기화한다.
  const [composing, setComposing] = useState(false);
  const isListState = state.open && !state.conversationId;
  if (composing && !isListState) setComposing(false);

  useEffect(() => {
    if (!state.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.isComposing || e.defaultPrevented) return;
      // 모달(Modal.tsx, aria-modal)이 떠 있으면 ESC는 그 모달이 가져가고 패널은 그대로 둔다
      if (document.querySelector('[aria-modal="true"]')) return;
      close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [state.open, close]);

  if (typeof document === "undefined" || !currentUserId) return null;

  const view = state.open && state.conversationId ? "conversation" : composing ? "new" : "list";

  function onSelectConversation(c: ConversationSummary) {
    openConversation(c.id, c.other);
  }

  return createPortal(
    <div
      className={`fixed top-0 right-0 z-40 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.08)] transition-transform duration-200 ease-out sm:w-[400px] ${
        state.open ? "translate-x-0" : "translate-x-full"
      }`}
      role="dialog"
      aria-label="메시지"
      aria-hidden={!state.open}
    >
      {view === "list" ? (
        <div className="flex flex-none items-start gap-3 border-b border-slate-200 px-5 pt-5 pb-4">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900">메시지</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">여행 관련 소통을 한곳에서 확인해보세요.</p>
          </div>
          <button type="button" onClick={close} aria-label="닫기" className={`${iconButton} -mt-1 -mr-2`}>
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="flex h-16 flex-none items-center gap-2 border-b border-slate-200 px-3">
          <button
            type="button"
            onClick={view === "new" ? () => setComposing(false) : openList}
            aria-label="목록으로"
            className={iconButton}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {view === "conversation" && state.open && state.conversationId && state.other ? (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar url={state.other.avatarUrl} nickname={state.other.nickname} size={32} />
              <p className="truncate text-[15px] font-semibold text-slate-900">{state.other.nickname}</p>
            </div>
          ) : (
            <p className="flex-1 text-base font-bold text-slate-900">{view === "new" ? "새 메시지" : ""}</p>
          )}

          <button type="button" onClick={close} aria-label="닫기" className={iconButton}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {!state.open ? null : view === "conversation" && state.conversationId ? (
          <ConversationPanelBody
            key={state.conversationId}
            conversationId={state.conversationId}
            other={state.other}
            currentUserId={currentUserId}
          />
        ) : view === "new" ? (
          <NewMessagePicker
            currentUserId={currentUserId}
            onStarted={(conversationId, other) => openConversation(conversationId, other)}
          />
        ) : (
          <ConversationListPanel
            currentUserId={currentUserId}
            activeConversationId={state.conversationId}
            onSelect={onSelectConversation}
            onCompose={() => setComposing(true)}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
