"use client";

import { useLoginPopup } from "@/components/auth/LoginPopupContext";

export function GuestAIPlanButton() {
  const { openPopup } = useLoginPopup();
  return (
    <button
      type="button"
      onClick={openPopup}
      className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
    >
      AI 여행계획 시작하기 →
    </button>
  );
}
