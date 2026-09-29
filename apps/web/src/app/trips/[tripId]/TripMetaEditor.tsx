"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, MoreVertical, Pencil, Share2 } from "lucide-react";
import { TripCreateForm } from "../TripCreateForm";
import { ShareLinkModal } from "./ShareLinkModal";
import { CoverPhotoModal } from "./CoverPhotoModal";
import { VISIBILITY_META, toVisibility } from "./visibility";

type TripMeta = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  personnel: number;
  visibility: string;
  coverPhotoKey: string | null;
  ownerNickname: string;
  // 넘기면 수정 팝업에서 태그도 편집(안 넘기면 태그 영역을 숨기고 기존 태그를 건드리지 않음)
  tags?: string[];
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

// 여행 제목/날짜/인원 표시 + 공유·수정·더보기 버튼. 수정(연필)은 예전처럼 히어로 영역 안에
// 인라인 폼을 펼치지 않고, "새 여행 만들기"와 같은 팝업(TripCreateForm의 수정 모드)을 띄운다.
export function TripMetaEditor({ trip, isOwner }: { trip: TripMeta; isOwner: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const visibilityMeta = VISIBILITY_META[toVisibility(trip.visibility)];
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

  return (
    <div className="flex flex-col gap-3">
      {/* 액션 버튼은 히어로 카드 오른쪽 위 모서리에 절대배치 — 부모(TripHeroBanner)의
          relative 컨테이너 기준으로 위치가 잡히므로, 아래 본문(제목/날짜)이 하단 정렬이어도
          버튼은 항상 카드 우상단에 고정된다. */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-3">
        {isOwner ? (
          <button
            // 공개 범위는 팝업 안에서 직접 고른다(예전처럼 여는 순간 "링크 공유"로 바꾸지 않음)
            onClick={() => setShareModalOpen(true)}
            aria-label="공유"
            title="공유"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur hover:bg-white/25"
          >
            <Share2 className="h-4 w-4" />
          </button>
        ) : null}
        <button
          onClick={() => setEditOpen(true)}
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
      {/* 공개 범위 상태 배지 — 예전 비공개/전체 공개 2버튼 토글은 "링크 공유" 상태를 표시하지 못해서 배지로 대체.
          변경은 공유 팝업의 "접근 권한"에서만 한다(소유자는 배지를 눌러 바로 열 수 있음). */}
      <div className="flex items-center gap-2">
        {isOwner ? (
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            title="공개 범위 변경"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
          >
            <visibilityMeta.icon className="h-3.5 w-3.5" />
            {visibilityMeta.label}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <visibilityMeta.icon className="h-3.5 w-3.5" />
            {visibilityMeta.label}
          </span>
        )}
      </div>
      {editOpen ? (
        <TripCreateForm
          mode="edit"
          trip={{
            id: trip.id,
            name: trip.name,
            startDate: trip.startDate,
            endDate: trip.endDate,
            personnel: trip.personnel,
            tags: trip.tags,
          }}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
      {shareModalOpen ? (
        <ShareLinkModal
          tripId={trip.id}
          tripName={trip.name}
          visibility={trip.visibility}
          onClose={() => setShareModalOpen(false)}
        />
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
