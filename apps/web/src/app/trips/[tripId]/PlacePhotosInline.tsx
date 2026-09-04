"use client";

import { useRef, useState } from "react";
import { PhotoLightbox } from "./PhotoLightbox";

type Photo = { id: string; storageKey: string };

export function PlacePhotosInline({
  tripId,
  placeId,
  initialPhotos,
  open,
}: {
  tripId: string;
  placeId: string;
  initialPhotos: Photo[];
  open: boolean;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
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

  if (!open) return null;

  return (
    <div
      className="ml-7 mt-1.5 flex flex-col gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 p-2"
      onClick={(e) => e.stopPropagation()}
    >
      {photos.length > 0 ? (
        <div className="grid grid-cols-4 gap-1.5">
          {photos.map((photo, i) => (
            <div key={photo.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.storageKey}
                alt=""
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(i);
                }}
                className="h-14 w-full cursor-pointer rounded object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(photo.id);
                }}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1 text-[9px] leading-4 text-white opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

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
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        className={`cursor-pointer rounded border border-dashed py-1.5 text-center text-[11px] text-neutral-400 hover:bg-white ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-neutral-300"
        }`}
      >
        {uploading ? "업로드 중..." : "+ 사진 추가"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {error ? <p className="text-[10px] text-red-600">{error}</p> : null}

      {lightboxIndex !== null ? (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      ) : null}
    </div>
  );
}
