"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Modal } from "@/components/Modal";
import { TripMetaEditor } from "./[tripId]/TripMetaEditor";

type TripMeta = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  personnel: number;
  visibility: string;
  coverPhotoKey: string | null;
};

// "수정"을 누르면 트립 상세에서 이미 검증된 TripMetaEditor(이름/날짜 수정 + 공유 + 공개범위 토글을
// 전부 포함)를 모달에 그대로 재사용한다 — 카드 목록용으로 같은 기능을 새로 만들지 않기 위함.
export function TripCardMenu({ trip, ownerNickname, onDelete }: { trip: TripMeta; ownerNickname: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="여행 관리 메뉴"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div
          onClick={(e) => e.preventDefault()}
          className="absolute right-0 top-full z-30 mt-1.5 w-36 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 text-left shadow-lg"
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditOpen(true);
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
          >
            수정 · 공유 · 공개범위
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      ) : null}

      {editOpen ? (
        <Modal onClose={() => setEditOpen(false)} title="여행 정보 관리">
          <TripMetaEditor trip={{ ...trip, ownerNickname }} isOwner />
        </Modal>
      ) : null}
    </div>
  );
}
