"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { PhotoLightbox } from "@/app/trips/[tripId]/PhotoLightbox";
import { ProfileEmpty } from "./ProfileTripList";

type Photo = { id: string; storageKey: string };

const PREVIEW_COUNT = 9;

// 공개 여행 사진 3열 정사각 그리드. 처음엔 9장만 보이고, 더 있으면 마지막 칸 위에 "+N"을 겹쳐
// 누르면 불러온 사진 전부를 펼친다. 사진을 누르면 여행 상세 화면과 같은 PhotoLightbox로 크게 본다.
export function ProfilePhotoGrid({ photos, totalCount }: { photos: Photo[]; totalCount: number }) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return <ProfileEmpty icon={<ImageOff className="h-6 w-6" />} text="아직 공개된 여행 사진이 없어요." />;
  }

  const collapsed = !expanded && photos.length > PREVIEW_COUNT;
  const visible = collapsed ? photos.slice(0, PREVIEW_COUNT) : photos;

  return (
    <div className="flex flex-col gap-2">
      <ul className="grid grid-cols-3 gap-0.5 overflow-hidden md:gap-1 md:rounded-xl">
        {visible.map((photo, i) => {
          const isMoreTile = collapsed && i === PREVIEW_COUNT - 1;
          return (
            <li key={photo.id} className="relative aspect-square bg-slate-100">
              <button
                type="button"
                onClick={() => (isMoreTile ? setExpanded(true) : setLightboxIndex(i))}
                aria-label={isMoreTile ? `사진 ${photos.length - PREVIEW_COUNT + 1}장 더 보기` : `사진 ${i + 1} 크게 보기`}
                className="group block h-full w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.storageKey}
                  alt=""
                  loading="lazy"
                  onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                {isMoreTile ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-900/50 text-lg font-semibold text-white">
                    +{photos.length - PREVIEW_COUNT + 1}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {expanded && totalCount > photos.length ? (
        <p className="text-center text-xs text-slate-400">최근 사진 {photos.length}장까지 보여드려요.</p>
      ) : null}

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
