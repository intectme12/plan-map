"use client";

import { useEffect } from "react";

type Photo = { id: string; storageKey: string };

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onNavigate((index + 1) % photos.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, photos.length, onClose, onNavigate]);

  const photo = photos[index];
  if (!photo) return null;

  return (
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

      {photos.length > 1 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((index - 1 + photos.length) % photos.length);
          }}
          aria-label="이전 사진"
          className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-2xl text-white hover:bg-black/60"
        >
          ‹
        </button>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.storageKey}
        alt=""
        className="max-h-[85vh] max-w-[90vw] rounded-md object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {photos.length > 1 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((index + 1) % photos.length);
          }}
          aria-label="다음 사진"
          className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-2xl text-white hover:bg-black/60"
        >
          ›
        </button>
      ) : null}

      {photos.length > 1 ? (
        <p className="absolute bottom-4 text-xs text-white/70">
          {index + 1} / {photos.length}
        </p>
      ) : null}
    </div>
  );
}
