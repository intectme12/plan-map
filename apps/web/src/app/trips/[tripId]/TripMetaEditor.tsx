"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, MoreVertical, Pencil, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareLinkModal } from "./ShareLinkModal";
import { CoverPhotoModal } from "./CoverPhotoModal";

type TripMeta = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  personnel: number;
  visibility: string;
  coverPhotoKey: string | null;
  ownerNickname: string;
};

const VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "비공개" },
  { value: "PUBLIC", label: "전체 공개" },
] as const;

function toDateInputValue(d: string | Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export function TripMetaEditor({ trip, isOwner }: { trip: TripMeta; isOwner: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(toDateInputValue(trip.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(trip.endDate));
  const [personnel, setPersonnel] = useState(trip.personnel);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharePending, setSharePending] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function onSetVisibility(visibility: string) {
    if (visibility === trip.visibility) return;
    setSharePending(true);
    await fetch(`/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
    });
    setSharePending(false);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch(`/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startDate, endDate, personnel }),
    });
    setPending(false);
    if (!res.ok) {
      setError("수정하지 못했습니다.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        {/* 액션 버튼은 히어로 카드 오른쪽 위 모서리에 절대배치 — 부모(TripHeroBanner)의
            relative 컨테이너 기준으로 위치가 잡히므로, 아래 본문(제목/날짜)이 하단 정렬이어도
            버튼은 항상 카드 우상단에 고정된다. */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-3">
          {isOwner ? (
            <button
              onClick={() => {
                // 링크 공개(UNLISTED)로 전환하면서 동시에 링크/닉네임 공유 팝업을 띄운다
                if (trip.visibility !== "UNLISTED") onSetVisibility("UNLISTED");
                setShareModalOpen(true);
              }}
              disabled={sharePending}
              aria-label="공유"
              title="공유"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur hover:bg-white/25 disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
            </button>
          ) : null}
          <button
            onClick={() => setEditing(true)}
            aria-label="여행 정보 수정"
            title="수정"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur hover:bg-white/25"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {isOwner ? (
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                aria-label="더보기"
                title="더보기"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur hover:bg-white/25"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {moreOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 text-left shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      setCoverModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {trip.coverPhotoKey ? "대표사진 변경" : "대표사진 설정"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div>
          <h1 className="text-lg font-bold text-white drop-shadow-sm sm:text-xl">{trip.name}</h1>
          <p className="text-xs text-white/85 drop-shadow-sm sm:text-sm">
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · {trip.personnel}명
            {!isOwner ? ` · ${trip.ownerNickname}님의 여행` : ""}
          </p>
        </div>
        {isOwner ? (
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-white/30 bg-white/15 p-0.5 backdrop-blur">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onSetVisibility(opt.value)}
                  disabled={sharePending}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                    trip.visibility === opt.value
                      ? "bg-white text-blue-600"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {shareModalOpen ? (
          <ShareLinkModal tripId={trip.id} onClose={() => setShareModalOpen(false)} />
        ) : null}
        {coverModalOpen ? (
          <CoverPhotoModal
            tripId={trip.id}
            currentCoverPhotoKey={trip.coverPhotoKey}
            onClose={() => setCoverModalOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur"
    >
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-semibold"
      />
      <div className="flex gap-2">
        <input
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-1/2 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="date"
          required
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-1/2 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <input
        type="number"
        min={1}
        max={50}
        value={personnel}
        onChange={(e) => setPersonnel(Number(e.target.value))}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-auto rounded-md px-3 py-1.5 text-xs font-semibold">
          {pending ? "저장 중..." : "저장"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditing(false)}
          className="h-auto rounded-md px-3 py-1.5 text-xs"
        >
          취소
        </Button>
      </div>
    </form>
  );
}
