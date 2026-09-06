"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastProvider";

export function NoticeForm({
  noticeId,
  initialTitle = "",
  initialContent = "",
}: {
  noticeId?: string;
  initialTitle?: string;
  initialContent?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch(noticeId ? `/api/admin/notices/${noticeId}` : "/api/admin/notices", {
      method: noticeId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setPending(false);
    if (!res.ok) {
      setError("저장하지 못했습니다. 입력값을 확인해주세요.");
      return;
    }
    toast.show(noticeId ? "공지사항을 수정했습니다." : "공지사항을 등록했습니다.");
    router.push("/admin/notices");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
      <input
        required
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <textarea
        required
        placeholder="내용"
        rows={8}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/notices")}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          취소
        </button>
      </div>
    </form>
  );
}
