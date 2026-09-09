"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageNavLink } from "@/components/MessageNavLink";
import { TripCreateForm } from "./TripCreateForm";
import { TripList, type Trip } from "./TripList";
import { SharedTripBrowser } from "./SharedTripBrowser";
import { FollowingTripBrowser } from "./FollowingTripBrowser";
import { SharedWithMeBrowser } from "./SharedWithMeBrowser";
import { UserSearchBrowser } from "./UserSearchBrowser";

type TabKey = "mine" | "shared" | "following" | "shared-with-me" | "users";

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm font-semibold ${
        active ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-500 hover:text-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}

export function TripsTabs({
  trips,
  currentUserId,
  unreadMessageCount,
}: {
  trips: Trip[];
  currentUserId: string;
  unreadMessageCount: number;
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
    <div className="flex flex-col gap-4">
      {/* 사용자 요청 순서: 내 여행계획 / 다른 사람 여행계획 / 팔로잉 피드 / 메시지 / 나에게 공유됨 / 회원검색 */}
      <nav className="flex gap-1 border-b border-neutral-200">
        <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
          내 여행계획
        </TabButton>
        <TabButton active={tab === "shared"} onClick={() => setTab("shared")}>
          다른 사람 여행계획
        </TabButton>
        <TabButton active={tab === "following"} onClick={() => setTab("following")}>
          팔로잉 피드
        </TabButton>
        <MessageNavLink
          currentUserId={currentUserId}
          initialUnreadCount={unreadMessageCount}
          className="relative border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-neutral-500 hover:text-neutral-700"
        />
        <TabButton active={tab === "shared-with-me"} onClick={() => setTab("shared-with-me")}>
          나에게 공유됨
        </TabButton>
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>
          회원검색
        </TabButton>
      </nav>

      {tab === "mine" ? (
        <>
          <TripCreateForm />
          <TripList trips={trips} />
        </>
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
