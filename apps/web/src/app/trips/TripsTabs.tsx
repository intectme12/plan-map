"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MyTripGrid } from "./MyTripGrid";
import { type MyTripCardData } from "./MyTripCard";
import { SharedTripBrowser } from "./SharedTripBrowser";
import { FollowingTripBrowser } from "./FollowingTripBrowser";
import { SharedWithMeBrowser } from "./SharedWithMeBrowser";
import { UserSearchBrowser } from "./UserSearchBrowser";

type TabKey = "mine" | "shared" | "following" | "shared-with-me" | "users";

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-none border-b-2 px-3 py-2 text-sm font-semibold ${
        active ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-500 hover:text-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}

export function TripsTabs({
  trips,
  sort,
  nickname,
  avatarUrl,
  sidebar,
  aiBanner,
}: {
  trips: MyTripCardData[];
  sort: string;
  nickname: string;
  avatarUrl: string | null;
  sidebar: React.ReactNode;
  aiBanner: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<TabKey>(
    initialTab === "shared" ||
      initialTab === "following" ||
      initialTab === "shared-with-me" ||
      initialTab === "users"
      ? initialTab
      : "mine"
  );

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* 사용자 요청 순서: 내 여행계획 / 다른 사람 여행계획 / 팔로잉 피드 / 나에게 공유됨 / 회원검색 (메시지는 헤더의 아이콘으로 이동) */}
      <nav className="scrollbar-none flex gap-1 overflow-x-auto whitespace-nowrap border-b border-neutral-200">
        <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
          내 여행계획
        </TabButton>
        <TabButton active={tab === "shared"} onClick={() => setTab("shared")}>
          다른 사람 여행계획
        </TabButton>
        <TabButton active={tab === "following"} onClick={() => setTab("following")}>
          팔로잉 피드
        </TabButton>
        <TabButton active={tab === "shared-with-me"} onClick={() => setTab("shared-with-me")}>
          나에게 공유됨
        </TabButton>
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>
          회원검색
        </TabButton>
      </nav>

      {tab === "mine" ? (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-10">
            <MyTripGrid trips={trips} sort={sort} nickname={nickname} avatarUrl={avatarUrl} />
            {aiBanner}
          </div>
          <div className="flex flex-col gap-10">{sidebar}</div>
        </div>
      ) : tab === "shared" ? (
        <SharedTripBrowser />
      ) : tab === "following" ? (
        <FollowingTripBrowser />
      ) : tab === "shared-with-me" ? (
        <SharedWithMeBrowser />
      ) : (
        <UserSearchBrowser />
      )}
    </div>
  );
}
