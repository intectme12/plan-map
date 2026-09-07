"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { TripShareManager } from "./TripShareManager";

export function ShareLinkModal({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/trips/shared/${tripId}`;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 클립보드 API가 막힌 환경(권한 거부 등) — input을 선택해서 수동 복사할 수 있게 폴백
      const input = document.getElementById("share-link-url") as HTMLInputElement | null;
      input?.select();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal onClose={onClose} title="공유 링크">
      <p className="text-xs text-neutral-500">
        이 링크를 아는 사람은 누구나 여행 계획을 볼 수 있습니다.
      </p>

      <div className="flex gap-1.5">
        <input
          id="share-link-url"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-600"
        />
        <button
          type="button"
          onClick={onCopy}
          className={`flex-none rounded-md border px-3 py-1.5 text-xs font-semibold ${
            copied
              ? "border-green-200 bg-green-50 text-green-600"
              : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
          }`}
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-xs text-neutral-400 hover:underline"
      >
        새 탭에서 열기 ↗
      </a>

      <div className="border-t border-neutral-200 pt-3">
        <TripShareManager tripId={tripId} />
      </div>
    </Modal>
  );
}
