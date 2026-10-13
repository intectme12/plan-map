"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastProvider";
import { Button } from "@/components/ui/button";

export function CopyTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function onCopy() {
    setPending(true);
    const res = await fetch(`/api/trips/${tripId}/copy`, { method: "POST" });
    setPending(false);
    if (!res.ok) {
      // 복사 한도(429)·보유 여행 수 상한(403) 등은 서버 안내 문구를 그대로 보여준다
      const body = await res.json().catch(() => null);
      toast.show(typeof body?.error === "string" ? body.error : "복사하지 못했습니다.");
      return;
    }
    const trip = await res.json();
    toast.show("내 여행계획으로 복사했습니다.");
    router.push(`/trips/${trip.id}`);
  }

  return (
    <Button onClick={onCopy} disabled={pending} className="h-auto rounded-md px-3 py-1.5 text-sm font-semibold">
      {pending ? "복사 중..." : "내 여행으로 복사하기"}
    </Button>
  );
}
