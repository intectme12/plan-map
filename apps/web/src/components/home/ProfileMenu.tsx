"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Avatar } from "@/components/Avatar";

export function ProfileMenu({
  nickname,
  avatarUrl,
  isAdmin,
}: {
  nickname: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 hover:bg-neutral-100"
      >
        <Avatar url={avatarUrl} nickname={nickname} size={32} />
        <span className="hidden text-sm font-medium text-neutral-800 sm:inline">{nickname}</span>
        <ChevronDown className="h-4 w-4 text-neutral-400" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
          <Link
            href="/trips"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            내 여행계획
          </Link>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            프로필 편집
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              관리자
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onLogout}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  );
}
