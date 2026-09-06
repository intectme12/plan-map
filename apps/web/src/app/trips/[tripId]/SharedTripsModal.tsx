"use client";

import { SharedTripBrowser } from "@/app/trips/SharedTripBrowser";

export function SharedTripsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">다른 사람 여행계획</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-neutral-400 hover:text-neutral-600"
          >
            ✕
          </button>
        </div>
        <SharedTripBrowser />
      </div>
    </div>
  );
}
