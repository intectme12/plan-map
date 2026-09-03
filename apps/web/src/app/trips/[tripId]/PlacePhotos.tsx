"use client";

import { useRef, useState } from "react";

type Photo = { id: string; storageKey: string };

export function PlacePhotos({
  tripId,
  placeId,
  initialPhotos,
  compact = false,
}: {
  tripId: string;
  placeId: string;
  initialPhotos: Photo[];
  compact?: boolean;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    setError(null);
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/trips/${tripId}/places/${placeId}/photos`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const photo = await res.json();
        setPhotos((prev) => [photo, ...prev]);
      } else {
        const data = await res.json().catch(() => null);
        setError(typeof data?.error === "string" ? data.error : "업로드에 실패했습니다.");
      }
    }
    setUploading(false);
  }

  async function onDelete(photoId: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    await fetch(`/api/trips/${tripId}/places/${placeId}/photos/${photoId}`, { method: "DELETE" });
  }

  const visiblePhotos = compact ? photos.slice(0, 3) : photos;
  const hiddenCount = compact ? photos.length - visiblePhotos.length : 0;

  return (
    <>
      <div className={compact ? "ml-7 mt-1 flex items-center gap-1" : "flex flex-wrap gap-2"}>
        {visiblePhotos.map((photo) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.id}
            src={photo.storageKey}
            alt=""
            className={compact ? "h-7 w-7 rounded object-cover" : "h-20 w-20 rounded-md object-cover"}
          />
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            compact
              ? "flex h-7 w-7 flex-none items-center justify-center rounded border border-dashed border-neutral-300 text-[10px] text-neutral-400 hover:bg-neutral-50"
              : "flex h-20 w-20 flex-none items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-neutral-400 hover:bg-neutral-50"
          }
        >
          {hiddenCount > 0 ? `+${hiddenCount}` : "+"}
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-lg bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">사진</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center text-sm text-neutral-500 ${
                dragOver ? "border-blue-400 bg-blue-50" : "border-neutral-300"
              }`}
            >
              {uploading ? "업로드 중..." : "드래그하거나 클릭해서 사진 추가"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && upload(e.target.files)}
              />
            </div>

            {error ? <p className="text-xs text-red-600">{error}</p> : null}

            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.storageKey} alt="" className="h-24 w-full rounded-md object-cover" />
                    <button
                      onClick={() => onDelete(photo.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400">아직 사진이 없습니다.</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
