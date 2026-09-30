import Link from "next/link";
import { MapPin, Calendar } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { LikeButton } from "@/components/LikeButton";
import { UserProfileTrigger } from "@/components/UserProfileTrigger";
import { formatTripDuration } from "@/lib/formatTripDuration";

export type DestinationCardData = {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  coverPhotoKey: string | null;
  tags: string[];
  _count: { places: number };
  likeCount: number;
  likedByMe: boolean;
  user: { nickname: string; avatarUrl: string | null };
};

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #2F6FED, #6EA8FE)",
  "linear-gradient(135deg, #FF7A45, #FFB088)",
  "linear-gradient(135deg, #16A34A, #6EE7B7)",
  "linear-gradient(135deg, #D97706, #FCD34D)",
  "linear-gradient(135deg, #7C3AED, #C4B5FD)",
];

function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PLACEHOLDER_GRADIENTS[Math.abs(hash) % PLACEHOLDER_GRADIENTS.length];
}

export function DestinationCard({
  trip,
  viewerLoggedIn = true,
}: {
  trip: DestinationCardData;
  viewerLoggedIn?: boolean;
}) {
  // 카드 전체 클릭 → 여행 상세, 작성자 클릭 → 프로필 팝업. <a> 안에 버튼을 넣을 수 없어서 카드 자체는 div로 두고
  // 여행 상세 링크를 카드 위에 덮는(absolute inset-0, z-10) 방식으로 깔고, 좋아요·작성자만 z-20으로 올린다.
  return (
    <div className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {trip.coverPhotoKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.coverPhotoKey}
            alt={trip.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center p-4 text-center text-base font-semibold text-white"
            style={{ background: gradientFor(trip.id) }}
          >
            {trip.name}
          </div>
        )}

        <div className="absolute inset-x-3 top-3 flex items-center justify-between">
          <span className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            📍 {trip.name}
          </span>
          {viewerLoggedIn ? (
            <LikeButton
              tripId={trip.id}
              initialLiked={trip.likedByMe}
              initialCount={trip.likeCount}
              className="relative z-20 flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs text-white backdrop-blur"
            />
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-xs text-white backdrop-blur">
              <span aria-hidden>♡</span>
              <span>{trip.likeCount}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="truncate text-base font-semibold text-neutral-900">{trip.name}</p>
        {/* 태그가 없어도 한 줄(h-4) 자리를 비워둔다 — 그리드 행이 따로인 "추천 여행지"와 "내 팔로잉 피드"는
            행 높이를 서로 맞춰주지 않아서, 태그 유무에 따라 양쪽 카드 높이가 달라졌던 문제 */}
        <p className="h-4 truncate text-xs text-blue-600">{trip.tags.map((t) => `#${t}`).join(" ")}</p>

        {/* 태그가 없어도 같은 줄의 다른 카드와 작성자 줄 높이가 맞도록 mt-auto로 카드 맨 아래에 고정 */}
        <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-3">
          {/* 작성자를 누르면 프로필 팝업. 프로필 API가 로그인 전용이라 게스트에게는 걸지 않는다 */}
          {viewerLoggedIn ? (
            <UserProfileTrigger
              nickname={trip.user.nickname}
              ariaLabel={`${trip.user.nickname} 프로필 보기`}
              className="relative z-20 flex min-w-0 items-center gap-1.5 text-xs text-neutral-500 hover:text-blue-600"
            >
              <Avatar url={trip.user.avatarUrl} nickname={trip.user.nickname} size={20} />
              <span className="truncate">{trip.user.nickname}의 여행기</span>
            </UserProfileTrigger>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-500">
              <Avatar url={trip.user.avatarUrl} nickname={trip.user.nickname} size={20} />
              <span className="truncate">{trip.user.nickname}의 여행기</span>
            </span>
          )}
          <span className="flex flex-none items-center gap-2 text-[11px] text-neutral-400">
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {trip._count.places}곳
            </span>
            <span className="flex items-center gap-0.5">
              <Calendar className="h-3 w-3" /> {formatTripDuration(trip.startDate, trip.endDate)}
            </span>
          </span>
        </div>
      </div>

      <Link href={`/trips/shared/${trip.id}`} aria-label={trip.name} className="absolute inset-0 z-10" />
    </div>
  );
}
