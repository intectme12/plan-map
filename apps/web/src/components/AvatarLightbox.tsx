"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export function AvatarLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="닫기"
        className="absolute right-4 top-4 text-2xl text-white/80 hover:text-white"
      >
        ✕
      </button>

      <div
        className="h-[70vmin] w-[70vmin] max-h-80 max-w-80 overflow-hidden rounded-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover" />
      </div>
    </div>,
    document.body
  );
}
