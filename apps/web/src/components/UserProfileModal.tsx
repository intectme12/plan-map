"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { SendMessageButton } from "@/components/SendMessageButton";
import { UserTripList } from "@/app/users/[nickname]/UserTripList";
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

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      profile: Profile;
      trips: SharedTripCardData[];
      canSeeTrips: boolean;
      isOwnProfile: boolean;
      followState: FollowState;
    };

// /users/[nickname] 페이지 내용을 새 화면 이동 없이 팝업으로 보여준다. 회원을 누르는 곳(홈 카드 작성자,
// 회원검색, 팔로워/팔로잉 목록, 팔로우 알림, 내 프로필 보기 등)은 전부 UserProfileTrigger로 이 팝업을 연다.
export function UserProfileModal({ nickname, onClose }: { nickname: string; onClose: () => void }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${encodeURIComponent(nickname)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: Omit<Extract<LoadState, { status: "ready" }>, "status">) => {
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

  return (
    <Modal onClose={onClose} title="프로필" scrollable>
      {state.status === "loading" ? (
        <p className="text-sm text-neutral-400">불러오는 중...</p>
      ) : state.status === "error" ? (
        <p className="text-sm text-neutral-500">회원 정보를 불러올 수 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <header className="flex items-center gap-4">
            <Avatar url={state.profile.avatarUrl} nickname={state.profile.nickname} size={56} />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{state.profile.nickname}</p>
              {state.profile.bio ? (
                <p className="truncate text-sm text-neutral-600">{state.profile.bio}</p>
              ) : null}
              <p className="text-xs text-neutral-400">
                {new Date(state.profile.createdAt).toLocaleDateString("ko-KR")} 가입
                {state.canSeeTrips ? ` · 공유 중인 여행 ${state.profile._count.trips}개` : null}
              </p>
              {/* 팔로워/팔로잉 목록은 페이지로 이동 — 이동하면 팝업은 닫는다 */}
              <p className="mt-1 flex gap-3 text-sm">
                <Link
                  href={`/users/${encodeURIComponent(state.profile.nickname)}/followers`}
                  onClick={onClose}
                  className="hover:underline"
                >
                  팔로워 <span className="font-semibold">{state.followState.followerCount}</span>
                </Link>
                <Link
                  href={`/users/${encodeURIComponent(state.profile.nickname)}/following`}
                  onClick={onClose}
                  className="hover:underline"
                >
                  팔로잉 <span className="font-semibold">{state.followState.followingCount}</span>
                </Link>
              </p>
            </div>
            {state.isOwnProfile ? null : (
              <div className="flex flex-none flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
                <FollowButton
                  nickname={state.profile.nickname}
                  initialIsFollowing={state.followState.isFollowing}
                  onChange={onFollowChange}
                  className="h-auto rounded-md px-3 py-1.5 text-xs"
                />
                <SendMessageButton
                  userId={state.profile.id}
                  className="h-auto flex-none rounded-md px-3 py-1.5 text-xs"
                />
              </div>
            )}
          </header>

          {state.canSeeTrips ? (
            <UserTripList userId={state.profile.id} initialTrips={state.trips} />
          ) : (
            <p className="text-sm text-neutral-500">이 회원은 여행 목록을 비공개로 설정했습니다.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
