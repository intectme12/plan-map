"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UserActions({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggleRole() {
    setPending(true);
    const nextRole = role === "ADMIN" ? "USER" : "ADMIN";
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    setPending(false);
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("이 회원을 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
    setPending(true);
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setPending(false);
    router.refresh();
  }

  if (isSelf) {
    return <span className="text-xs text-neutral-400">본인 계정</span>;
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={toggleRole}
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs disabled:opacity-40"
      >
        {role === "ADMIN" ? "관리자 해제" : "관리자 지정"}
      </button>
      <button
        disabled={pending}
        onClick={onDelete}
        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40"
      >
        삭제
      </button>
    </div>
  );
}
