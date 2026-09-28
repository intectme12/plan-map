"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/ToastProvider";

export function MessageComposer({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent: () => void;
}) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentAtRef = useRef(0);
  // Enter 두 번이 같은 틱 안에 연달아 들어오면(IME 중복 keydown 등) pending state는 아직
  // 리렌더 전이라 두 번째 호출도 false로 읽혀 막지 못한다 — ref로 동기적으로 막는다.
  const submittingRef = useRef(false);
  const toast = useToast();

  // 매 키 입력마다 보내지 않고 2초에 한 번 정도만 신호를 보낸다 — 계속 입력 중이면 이 정도
  // 간격으로도 받는 쪽의 4초짜리 "입력 중" 표시(ConversationView.tsx)가 끊기지 않는다.
  function onContentChange(value: string) {
    setContent(value);
    const now = Date.now();
    if (now - lastTypingSentAtRef.current > 2000) {
      lastTypingSentAtRef.current = now;
      fetch(`/api/conversations/${conversationId}/typing`, { method: "POST" });
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    const trimmed = content.trim();
    if (!trimmed && !imageFile) return;

    submittingRef.current = true;
    setPending(true);
    const formData = new FormData();
    if (trimmed) formData.set("content", trimmed);
    if (imageFile) formData.set("image", imageFile);

    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: formData,
    });
    submittingRef.current = false;
    setPending(false);

    if (!res.ok) {
      toast.show("메시지 전송에 실패했습니다.");
      return;
    }

    setContent("");
    clearImage();
    onSent();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 border-t border-neutral-200 p-3">
      {imagePreviewUrl ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreviewUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
          <button
            type="button"
            onClick={clearImage}
            aria-label="사진 취소"
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs text-white"
          >
            ✕
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <label className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-md border border-neutral-300 text-neutral-500 hover:bg-neutral-50">
          📷
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
        </label>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={(e) => {
            // 한글 등 조합형 입력(IME)에서 조합을 확정하려고 누른 Enter까지 전송으로 잡으면
            // 브라우저에 따라 keydown이 두 번(조합 확정 1번 + 실제 Enter 1번) 들어와 폼이
            // 두 번 제출된다 — isComposing(및 조합 종료 직후 남는 229 keyCode)인 동안은 무시.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          placeholder="메시지 보내기"
          className="max-h-32 flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <Button
          type="submit"
          disabled={pending || (!content.trim() && !imageFile)}
          className="h-9 rounded-md px-4 text-sm font-semibold"
        >
          전송
        </Button>
      </div>
    </form>
  );
}
