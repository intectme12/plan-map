"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastProvider";

export function CopyTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function onCopy() {
    setPending(true);
    const res = await fetch(`/api/trips/${tripId}/copy`, { method: "POST" });
    setPending(false);
    if (!res.ok) {
      toast.show("복사하지 못했습니다.");
      return;
    }
    const trip = await res.json();
    toast.show("내 여행계획으로 복사했습니다.");
    router.push(`/trips/${trip.id}`);
  }

  return (
    <button
      onClick={onCopy}
      disabled={pending}
      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
    >
      {pending ? "복사 중..." : "내 여행으로 복사하기"}
    </button>
  );
}
