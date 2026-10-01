"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Lock, X } from "lucide-react";
import { FullBleedModal } from "@/components/Modal";
import { ProfileHeader, TasteTags } from "@/components/profile/ProfileHeader";
import { ProfilePhotoGrid } from "@/components/profile/ProfilePhotoGrid";
import { ProfileTripList, ProfileTripRow } from "@/components/profile/ProfileTripList";
import type { SharedTripCardData } from "@/app/trips/SharedTripCard";

type Profile = {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  _count: { trips: number };
};

type FollowState = { followerCount: number; followingCount: number; isFollowing: boolean };

type Highlights = {
  photos: { id: string; storageKey: string }[];
  photoCount: number;
  tasteTags: string[];
  coverPhotoKey: string | null;
  sharedWithMe: SharedTripCardData[];
};

type ProfileData = {
  profile: Profile;
  trips: SharedTripCardData[];
  canSeeTrips: boolean;
  isOwnProfile: boolean;
  followState: FollowState;
  highlights: Highlights;
};

type LoadState = { status: "loading" } | { status: "error" } | ({ status: "ready" } & ProfileData);

type TabKey = "photos" | "trips" | "shared";

const RECENT_TRIP_COUNT = 3;

// /users/[nickname] 페이지 내용을 새 화면 이동 없이 팝업으로 보여준다. 회원을 누르는 곳(홈 카드 작성자,
// 회원검색, 팔로워/팔로잉 목록, 팔로우 알림, 내 프로필 보기 등)은 전부 UserProfileTrigger로 이 팝업을 연다.
// PC는 최대 960px 카드(위쪽 프로필 한 덩어리 + 아래 탭/사이드 2열), 768px 미만은 전체 화면.
export function UserProfileModal({ nickname, onClose }: { nickname: string; onClose: () => void }) {
  // 다른 회원으로 바뀌거나 "다시 시도"하면 key가 바뀌어 내용 상태(탭·로딩 결과)가 통째로 초기화된다
  const [attempt, setAttempt] = useState(0);

  return (
    <FullBleedModal onClose={onClose} title={`${nickname} 프로필`}>
      <ProfileContent
        key={`${nickname}:${attempt}`}
        nickname={nickname}
        onClose={onClose}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    </FullBleedModal>
  );
}

function ProfileContent({
  nickname,
  onClose,
  onRetry,
}: {
  nickname: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [tab, setTab] = useState<TabKey | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${encodeURIComponent(nickname)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: ProfileData) => {
        if (!cancelled) setState({ status: "ready", ...data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [nickname]);

  function onFollowChange(isFollowing: boolean) {
    setState((prev) =>
      prev.status === "ready"
        ? {
            ...prev,
            followState: {
              ...prev.followState,
              isFollowing,
              followerCount: prev.followState.followerCount + (isFollowing ? 1 : -1),
            },
          }
        : prev
    );
  }

  function showTab(key: TabKey) {
    setTab(key);
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // 상단 바: 커버 위에서는 투명(닫기 버튼만), 스크롤해 내려가면 흰 바탕 + 닉네임이 나타난다
  const topBar = (
    <div
      className={`absolute inset-x-0 top-0 z-10 flex items-center gap-2 px-2 pt-[env(safe-area-inset-top)] transition-colors md:px-3 ${
        scrolled ? "border-b border-slate-200 bg-white/95 backdrop-blur" : "bg-transparent"
      }`}
    >
      <p
        className={`min-w-0 flex-1 truncate pl-3 text-base font-semibold text-slate-900 transition-opacity ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!scrolled}
      >
        {nickname}
      </p>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className={`my-1.5 flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors ${
          scrolled || state.status !== "ready"
            ? "text-slate-600 hover:bg-slate-100"
            : "bg-slate-900/50 text-white backdrop-blur-sm hover:bg-slate-900/65"
        }`}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );

  if (state.status === "loading") {
    return (
      <>
        {topBar}
        <ProfileSkeleton />
      </>
    );
  }

  if (state.status === "error") {
    return (
      <>
        {topBar}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
          <AlertCircle className="h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-600">회원 정보를 불러올 수 없습니다.</p>
          <button
            type="button"
            onClick={onRetry}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            다시 시도
          </button>
        </div>
      </>
    );
  }

  const { profile, trips, canSeeTrips, isOwnProfile, followState, highlights } = state;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    ...(canSeeTrips
      ? [
          { key: "photos" as const, label: "여행 사진", count: highlights.photoCount },
          { key: "trips" as const, label: "여행계획", count: profile._count.trips },
        ]
      : []),
    ...(highlights.sharedWithMe.length > 0
      ? [{ key: "shared" as const, label: "나에게 공유한 여행", count: highlights.sharedWithMe.length }]
      : []),
  ];
  const activeTab = tab ?? tabs[0]?.key ?? null;
  const recentTrips = trips.slice(0, RECENT_TRIP_COUNT);
  // 공개 여행이 하나도 없으면 취향 태그도 없으므로(공개 여행 태그에서 뽑음) 오른쪽 요약 칸 없이 한 열로 그린다 —
  // 왼쪽 탭의 빈 상태 안내와 같은 문구가 두 번 나오지 않게
  const hasAside = canSeeTrips && trips.length > 0;

  return (
    <>
      {topBar}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 96)}
      >
        <ProfileHeader
          data={{
            id: profile.id,
            nickname: profile.nickname,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            createdAt: profile.createdAt,
            tripCount: canSeeTrips ? profile._count.trips : null,
            followerCount: followState.followerCount,
            followingCount: followState.followingCount,
            isFollowing: followState.isFollowing,
            isOwnProfile,
            coverPhotoKey: highlights.coverPhotoKey,
            tasteTags: highlights.tasteTags,
          }}
          onFollowChange={onFollowChange}
          onTripsClick={() => showTab("trips")}
          onNavigate={onClose}
        />

        <div
          className={`mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 border-t border-slate-100 px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8 md:pb-8 ${
            hasAside ? "md:grid-cols-[minmax(0,1fr)_280px]" : ""
          }`}
        >
          {/* 왼쪽: 탭 + 사진/여행계획 */}
          <div className="min-w-0">
            {!canSeeTrips ? (
              <div className="mt-4 mb-2 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <Lock className="h-4 w-4 flex-none" />이 회원은 여행 목록을 비공개로 설정했습니다.
              </div>
            ) : null}

            {tabs.length > 0 ? (
              <>
                <div
                  ref={tabsRef}
                  role="tablist"
                  aria-label="프로필 콘텐츠"
                  className="sticky top-14 z-[5] -mx-4 flex scroll-mt-14 overflow-x-auto overflow-y-hidden bg-white px-4 shadow-[inset_0_-1px_0_#e2e8f0] [scrollbar-width:none] md:static md:mx-0 md:px-0"
                >
                  {tabs.map((t) => {
                    const selected = t.key === activeTab;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setTab(t.key)}
                        className={`flex h-12 flex-none items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition-colors ${
                          selected
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {t.label}
                        <span className={`text-xs ${selected ? "text-blue-500" : "text-slate-400"}`}>{t.count}</span>
                      </button>
                    );
                  })}
                </div>

                <div role="tabpanel" className="pt-4">
                  {activeTab === "photos" ? (
                    <div className="-mx-4 md:mx-0">
                      <ProfilePhotoGrid photos={highlights.photos} totalCount={highlights.photoCount} />
                    </div>
                  ) : activeTab === "trips" ? (
                    <ProfileTripList
                      key="trips"
                      userId={profile.id}
                      initialTrips={trips}
                      emptyText="아직 공개된 여행계획이 없습니다."
                      onNavigate={onClose}
                    />
                  ) : activeTab === "shared" ? (
                    <ProfileTripList
                      key="shared"
                      userId={profile.id}
                      initialTrips={highlights.sharedWithMe}
                      emptyText="공유받은 여행이 없습니다."
                      paginate={false}
                      hrefBase="/trips"
                      onNavigate={onClose}
                    />
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          {/* 오른쪽(모바일은 아래): 취향 태그 + 최근 여행계획 요약 */}
          {hasAside ? (
            // 모바일에서 여행계획 탭을 보고 있으면 같은 목록이 바로 아래 또 나오지 않게 요약을 숨긴다
            <aside className={`${activeTab === "trips" ? "hidden" : "flex"} min-w-0 flex-col gap-5 md:flex md:pt-4`}>
              {highlights.tasteTags.length > 0 ? (
                <div className="hidden md:block">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">여행 취향</h3>
                  <TasteTags tags={highlights.tasteTags} />
                </div>
              ) : null}

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">최근 여행계획</h3>
                  {trips.length > RECENT_TRIP_COUNT ? (
                    <button
                      type="button"
                      onClick={() => showTab("trips")}
                      className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      전체 보기
                    </button>
                  ) : null}
                </div>
                <ul className="-mx-2 flex flex-col">
                  {recentTrips.map((trip) => (
                    <li key={trip.id}>
                      <ProfileTripRow trip={trip} interactive={false} onNavigate={onClose} />
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex-1 animate-pulse overflow-hidden" aria-label="불러오는 중" role="status">
      <div className="h-36 bg-slate-100 md:h-52" />
      <div className="px-4 md:px-8">
        <div className="-mt-12 h-24 w-24 rounded-full border-4 border-white bg-slate-200 md:-mt-16 md:h-32 md:w-32" />
        <div className="mt-4 h-6 w-40 rounded bg-slate-200" />
        <div className="mt-2 h-4 w-64 max-w-full rounded bg-slate-100" />
        <div className="mt-5 grid h-16 grid-cols-3 gap-1 rounded-xl bg-slate-50 md:max-w-md" />
        <div className="mt-6 grid grid-cols-3 gap-1 pb-8">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-square rounded bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
