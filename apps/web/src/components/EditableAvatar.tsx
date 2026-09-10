"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";

export function EditableAvatar({
  url,
  nickname,
  size = 72,
}: {
  url: string | null;
  nickname: string;
  size?: number;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  async function onChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setPending(true);
    const formData = new FormData();
    formData.append("file", file);
    await fetch("/api/account/avatar", { method: "POST", body: formData });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <Avatar url={url} nickname={nickname} size={size} />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={pending}
        aria-label="프로필 사진 변경"
        className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-sm font-bold leading-none text-white hover:bg-blue-700 disabled:opacity-50"
      >
        +
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onChange(e.target.files)}
      />
    </div>
  );
}
