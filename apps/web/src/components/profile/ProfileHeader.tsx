"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Pencil, Share2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/FollowButton";
import { SendMessageButton } from "@/components/SendMessageButton";
import { useToast } from "@/components/toast/ToastProvider";

export type ProfileHeaderData = {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  tripCount: number | null; // 여행목록 비공개면 null — 숫자 대신 "–"
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  coverPhotoKey: string | null;
  tasteTags: string[];
};

// 커버 사진이 없거나 로딩에 실패하면 보여주는 브랜드 기본 배경(연한 파랑 + 점 패턴)
function CoverFallback() {
  return (
    <div className="h-full w-full bg-blue-50 bg-[radial-gradient(circle,#bfdbfe_1.2px,transparent_1.2px)] [background-size:18px_18px]" />
  );
}

function ProfileCover({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-36 w-full flex-none overflow-hidden bg-slate-100 md:h-52">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <CoverFallback />
      )}
    </div>
  );
}

export function TasteTags({ tags, className = "" }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="여행 취향 태그">
      {tags.map((tag) => (
        <li key={tag} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          #{tag}
        </li>
      ))}
    </ul>
  );
}

function Stat({ value, label }: { value: number | null; label: string }) {
  return (
    <>
      <span className="text-lg font-bold leading-tight text-slate-900">{value ?? "–"}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </>
  );
}

const statClass =
  "flex min-h-14 flex-col items-center justify-center rounded-lg py-2 transition-colors outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-blue-500";

// 프로필 위쪽 한 덩어리: 커버 → 아바타 + 닉네임/가입일 + (PC) 액션 버튼 → 소개 → 통계 → (모바일) 액션 버튼.
// 액션 버튼은 FollowButton이 자체 상태를 가지므로 PC/모바일용을 두 번 그리지 않고, 한 번만 그린 뒤
// 모바일은 flex order, PC는 grid 위치 지정으로 자리만 바꾼다.
export function ProfileHeader({
  data,
  onFollowChange,
  onTripsClick,
  onNavigate,
}: {
  data: ProfileHeaderData;
  onFollowChange: (isFollowing: boolean) => void;
  onTripsClick: () => void;
  onNavigate: () => void;
}) {
  const toast = useToast();
  const encoded = encodeURIComponent(data.nickname);

  async function onShare() {
    const url = `${window.location.origin}/users/${encoded}`;
    // 모바일(터치)에서는 OS 공유 시트, PC에서는 링크 복사
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: `${data.nickname}님의 프로필`, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.show("프로필 링크를 복사했어요.");
    } catch {
      toast.show("링크를 복사할 수 없습니다.");
    }
  }

  const actionButton = "h-11 rounded-lg px-4 text-sm font-semibold md:h-10";

  return (
    <section>
      <ProfileCover src={data.coverPhotoKey} />

      <div className="flex flex-col px-4 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end md:gap-x-6 md:px-8">
        {/* 아바타 — 커버 아래쪽에 반쯤 겹친다 */}
        <div className="order-1 -mt-12 h-24 w-24 flex-none rounded-full bg-white p-1 shadow-[0_2px_8px_rgba(15,23,42,0.12)] md:col-start-1 md:row-start-1 md:-mt-16 md:h-32 md:w-32 [&>*]:!h-full [&>*]:!w-full">
          <Avatar url={data.avatarUrl} nickname={data.nickname} size={128} />
        </div>

        <div className="order-2 mt-3 min-w-0 md:col-start-2 md:row-start-1 md:mt-0 md:pb-1">
          <h2 className="truncate text-xl font-bold text-slate-900 md:text-2xl">{data.nickname}</h2>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(data.createdAt).toLocaleDateString("ko-KR")} 가입
          </p>
        </div>

        {data.bio ? (
          <p className="order-3 mt-3 line-clamp-3 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 md:col-span-3 md:row-start-2 md:mt-4">
            {data.bio}
          </p>
        ) : null}

        <TasteTags tags={data.tasteTags} className="order-4 mt-3 md:hidden" />

        <div className="order-5 mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1 md:col-span-3 md:row-start-3 md:max-w-md">
          {data.tripCount !== null ? (
            <button type="button" onClick={onTripsClick} className={statClass}>
              <Stat value={data.tripCount} label="여행계획" />
            </button>
          ) : (
            <div className={statClass} title="여행 목록 비공개">
              <Stat value={null} label="여행계획" />
            </div>
          )}
          {/* 팔로워/팔로잉 목록은 페이지로 이동 — 이동하면 팝업은 닫는다 */}
          <Link href={`/users/${encoded}/followers`} onClick={onNavigate} className={statClass}>
            <Stat value={data.followerCount} label="팔로워" />
          </Link>
          <Link href={`/users/${encoded}/following`} onClick={onNavigate} className={statClass}>
            <Stat value={data.followingCount} label="팔로잉" />
          </Link>
        </div>

        <div className="order-6 mt-4 flex gap-2 md:col-start-3 md:row-start-1 md:mt-0 md:pb-1">
          {data.isOwnProfile ? (
            <Button asChild variant="outline" className={`${actionButton} flex-1 md:flex-none`}>
              <Link href="/account" onClick={onNavigate}>
                <Pencil className="h-4 w-4" />
                프로필 수정
              </Link>
            </Button>
          ) : (
            <>
              <FollowButton
                nickname={data.nickname}
                initialIsFollowing={data.isFollowing}
                onChange={onFollowChange}
                className={`${actionButton} flex-1 md:w-28 md:flex-none`}
              />
              <SendMessageButton
                userId={data.id}
                onOpened={onNavigate}
                className={`${actionButton} flex-1 md:flex-none`}
              />
            </>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onShare}
            aria-label="프로필 공유"
            className="h-11 w-11 flex-none rounded-lg p-0 md:h-10 md:w-10"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
