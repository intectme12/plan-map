"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/ToastProvider";

export function SendMessageButton({ userId, className }: { userId: string; className?: string }) {
  const [sending, setSending] = useState(false);
  const router = useRouter();
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
    router.push(`/messages/${conversation.id}`);
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
