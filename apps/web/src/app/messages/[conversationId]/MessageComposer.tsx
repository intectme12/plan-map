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
  const toast = useToast();

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
    const trimmed = content.trim();
    if (!trimmed && !imageFile) return;

    setPending(true);
    const formData = new FormData();
    if (trimmed) formData.set("content", trimmed);
    if (imageFile) formData.set("image", imageFile);

    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: formData,
    });
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
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
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
