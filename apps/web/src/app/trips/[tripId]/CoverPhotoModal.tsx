"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";

export function CoverPhotoModal({
  tripId,
  currentCoverPhotoKey,
  onClose,
}: {
  tripId: string;
  currentCoverPhotoKey: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setPending(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/trips/${tripId}/cover-photo`, { method: "POST", body: formData });
    setPending(false);
    if (!res.ok) {
      setError("업로드하지 못했습니다.");
      return;
    }
    router.refresh();
    onClose();
  }

  async function remove() {
    setPending(true);
    await fetch(`/api/trips/${tripId}/cover-photo`, { method: "DELETE" });
    setPending(false);
    router.refresh();
    onClose();
  }

  return (
    <Modal title="대표사진 설정" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {currentCoverPhotoKey ? (
          <img
            src={currentCoverPhotoKey}
            alt="현재 대표사진"
            className="aspect-square w-full rounded-md object-cover"
          />
        ) : (
          <p className="text-sm text-neutral-500">아직 대표사진이 없습니다.</p>
        )}
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
            className="h-auto rounded-md px-3 py-1.5 text-xs font-semibold"
          >
            {pending ? "처리 중..." : currentCoverPhotoKey ? "사진 바꾸기" : "사진 선택"}
          </Button>
          {currentCoverPhotoKey ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={remove}
              className="h-auto rounded-md px-3 py-1.5 text-xs"
            >
              제거
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
