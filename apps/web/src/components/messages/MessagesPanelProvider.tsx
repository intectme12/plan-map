"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type OtherUser = { id: string; nickname: string; avatarUrl: string | null };

type PanelState =
  | { open: false; conversationId: string | null }
  | { open: true; conversationId: null }
  | { open: true; conversationId: string; other?: OtherUser };

type MessagesPanelContextValue = {
  state: PanelState;
  currentUserId: string | null;
  openList: () => void;
  openConversation: (conversationId: string, other?: OtherUser) => void;
  setActiveOther: (conversationId: string, other: OtherUser) => void;
  close: () => void;
  toggle: () => void;
};

const MessagesPanelContext = createContext<MessagesPanelContextValue | null>(null);

// AppBadgeSync.tsx와 같은 방식으로 서버 prop 없이 /api/auth/me에서 현재 유저 id를 가져온다 —
// 이 Provider는 루트 레이아웃에 전역으로 떠 있어서 페이지별 서버 prop을 받을 수 없다.
export function MessagesPanelProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PanelState>({ open: false, conversationId: null });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const fetchingUserRef = useRef(false);

  // router.refresh()로 로그인/로그아웃하면 루트 레이아웃(이 Provider)은 리마운트되지 않고
  // 서버 컴포넌트만 다시 그려지므로, currentUserId가 아직 없을 때마다 다시 시도해야 한다 —
  // 최초 마운트 시 1회로 fetchedUserRef를 영구히 막아버리면 "로그인 전에 한 번 fetch됨" 세션에서
  // 로그인 후에도 currentUserId가 계속 null로 남아 메시지 패널이 안 열리는 버그가 생긴다.
  const ensureCurrentUser = useCallback(() => {
    if (currentUserId || fetchingUserRef.current) return;
    fetchingUserRef.current = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user: { id: string } | null } | null) => {
        if (data?.user) setCurrentUserId(data.user.id);
      })
      .finally(() => {
        fetchingUserRef.current = false;
      });
  }, [currentUserId]);

  useEffect(() => {
    ensureCurrentUser();
  }, [ensureCurrentUser]);

  const openList = useCallback(() => {
    ensureCurrentUser();
    setState({ open: true, conversationId: null });
  }, [ensureCurrentUser]);

  const openConversation = useCallback(
    (conversationId: string, other?: OtherUser) => {
      ensureCurrentUser();
      setState({ open: true, conversationId, other });
    },
    [ensureCurrentUser]
  );

  // SendMessageButton처럼 other 정보 없이 연 대화의 패널 헤더(아바타/닉네임)를, 본문에서
  // 요약을 fetch해온 뒤 채워 넣기 위한 것 — 그 사이 다른 대화로 넘어갔으면 무시한다.
  const setActiveOther = useCallback((conversationId: string, other: OtherUser) => {
    setState((prev) =>
      prev.open && prev.conversationId === conversationId ? { ...prev, other } : prev
    );
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ open: false, conversationId: prev.conversationId }));
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => {
      if (prev.open) return { open: false, conversationId: prev.conversationId };
      ensureCurrentUser();
      return prev.conversationId
        ? { open: true, conversationId: prev.conversationId }
        : { open: true, conversationId: null };
    });
  }, [ensureCurrentUser]);

  const value = useMemo(
    () => ({ state, currentUserId, openList, openConversation, setActiveOther, close, toggle }),
    [state, currentUserId, openList, openConversation, setActiveOther, close, toggle]
  );

  return <MessagesPanelContext.Provider value={value}>{children}</MessagesPanelContext.Provider>;
}

export function useMessagesPanel() {
  const ctx = useContext(MessagesPanelContext);
  if (!ctx) throw new Error("useMessagesPanel은 MessagesPanelProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
