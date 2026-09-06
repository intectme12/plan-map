"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NoticeDeleteButton({ noticeId }: { noticeId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!confirm("이 공지사항을 삭제하시겠습니까?")) return;
    setPending(true);
    await fetch(`/api/admin/notices/${noticeId}`, { method: "DELETE" });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      disabled={pending}
      onClick={onDelete}
      className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40"
    >
      삭제
    </button>
  );
}
