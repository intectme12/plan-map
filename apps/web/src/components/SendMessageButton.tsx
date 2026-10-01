"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/ToastProvider";
import { useMessagesPanel } from "@/components/messages/MessagesPanelProvider";

export function SendMessageButton({
  userId,
  className,
  onOpened,
}: {
  userId: string;
  className?: string;
  // 메시지 패널(z-40)은 팝업(z-50) 아래에 뜨므로, 팝업 안에서 쓸 때는 대화가 열리면 팝업을 닫게 한다
  onOpened?: () => void;
}) {
  const [sending, setSending] = useState(false);
  const { openConversation } = useMessagesPanel();
  const toast = useToast();

  async function onClick() {
    setSending(true);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setSending(false);
    if (!res.ok) {
      toast.show("메시지를 시작할 수 없습니다.");
      return;
    }
    const conversation = await res.json();
    openConversation(conversation.id);
    onOpened?.();
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={sending}
      onClick={onClick}
      className={className ?? "h-auto rounded-md px-3 py-1.5 text-xs"}
    >
      메시지 보내기
    </Button>
  );
}
