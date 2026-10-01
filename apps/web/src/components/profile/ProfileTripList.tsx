"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Heart, MapPin } from "lucide-react";
import { LikeButton } from "@/components/LikeButton";
import type { SharedTripCardData } from "@/app/trips/SharedTripCard";

const PAGE_SIZE = 20;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// 여행 날짜로만 계산하는 상태 — 끝난 여행은 배지를 달지 않는다
function tripStatus(trip: SharedTripCardData): { label: string; className: string } | null {
  const today = startOfDay(new Date());
  const start = startOfDay(new Date(trip.startDate));
  const end = startOfDay(new Date(trip.endDate));
  if (start <= today && today <= end) return { label: "진행 중", className: "bg-blue-600 text-white" };
  if (start > today) return { label: "예정", className: "bg-blue-50 text-blue-700" };
  return null;
}

function formatPeriod(startDate: string | Date, endDate: string | Date) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${s.getFullYear()}.${pad(s.getMonth() + 1)}.${pad(s.getDate())}`;
  const end =
    s.getFullYear() === e.getFullYear()
      ? `${pad(e.getMonth() + 1)}.${pad(e.getDate())}`
      : `${e.getFullYear()}.${pad(e.getMonth() + 1)}.${pad(e.getDate())}`;
  return `${start} – ${end}`;
}

// 프로필 팝업의 여행계획 한 줄 — 썸네일 + 제목/상태 + 기간·장소 수. 카드 전체가 상세 페이지 링크이고,
// interactive면 좋아요 버튼을(링크 밖에) 두고, 아니면 좋아요 수만 표시한다(우측 "최근 여행계획" 요약용).
export function ProfileTripRow({
  trip,
  interactive = true,
  hrefBase = "/trips/shared",
  onNavigate,
}: {
  trip: SharedTripCardData;
  interactive?: boolean;
  hrefBase?: string;
  onNavigate?: () => void;
}) {
  const status = tripStatus(trip);

  return (
    <div className="flex items-center gap-1 rounded-xl transition-colors hover:bg-slate-50">
      <Link
        href={`${hrefBase}/${trip.id}`}
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div className="h-16 w-16 flex-none overflow-hidden rounded-lg bg-slate-100">
          {trip.coverPhotoKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={trip.coverPhotoKey} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-blue-50 text-blue-300">
              <MapPin className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {status ? (
            <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
              {status.label}
            </span>
          ) : null}
          <p className="truncate text-sm font-semibold text-slate-900">{trip.name}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5 flex-none" />
            <span className="truncate">
              {formatPeriod(trip.startDate, trip.endDate)} · 장소 {trip._count.places}개
            </span>
          </p>
        </div>
      </Link>
      {interactive ? (
        <LikeButton
          tripId={trip.id}
          initialLiked={trip.likedByMe}
          initialCount={trip.likeCount}
        />
      ) : (
        <span className="flex flex-none items-center gap-1 px-2 text-xs text-slate-400">
          <Heart className="h-3.5 w-3.5" />
          {trip.likeCount}
        </span>
      )}
    </div>
  );
}

// 여행계획 탭 — 기존 UserTripList와 같은 API(/api/trips/shared?userId=)로 20개씩 더 불러온다
export function ProfileTripList({
  userId,
  initialTrips,
  emptyText,
  paginate = true,
  hrefBase,
  onNavigate,
}: {
  userId: string;
  initialTrips: SharedTripCardData[];
  emptyText: string;
  paginate?: boolean;
  // 기본은 공개 여행 상세(/trips/shared). 나에게 공유된 여행은 "나에게 공유됨" 목록처럼 편집 화면(/trips)으로 연다
  hrefBase?: string;
  onNavigate?: () => void;
}) {
  const [trips, setTrips] = useState(initialTrips);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(paginate && initialTrips.length === PAGE_SIZE);

  async function loadMore() {
    setLoading(true);
    const res = await fetch(`/api/trips/shared?userId=${userId}&cursor=${trips.length}`);
    const data: SharedTripCardData[] = res.ok ? await res.json() : [];
    setLoading(false);
    setHasMore(data.length === PAGE_SIZE);
    setTrips((prev) => [...prev, ...data]);
  }

  if (trips.length === 0) {
    return <ProfileEmpty icon={<MapPin className="h-6 w-6" />} text={emptyText} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {trips.map((trip) => (
          <li key={trip.id}>
            <ProfileTripRow trip={trip} hrefBase={hrefBase} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="h-10 self-center rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "불러오는 중..." : "더 보기"}
        </button>
      ) : null}
    </div>
  );
}

export function ProfileEmpty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400">{icon}</div>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}
