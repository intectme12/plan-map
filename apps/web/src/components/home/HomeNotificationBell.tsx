"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { UserProfileModal } from "@/components/UserProfileModal";
import {
  formatNotificationDate,
  notificationText,
  notificationHref,
  type NotificationItem,
} from "@/lib/notificationDisplay";

const POPUP_ITEM_LIMIT = 10;

// 예전엔 벨 아이콘이 /notifications로 바로 이동했지만, 이제 클릭하면 최신 10개를 팝업으로
// 먼저 보여주고 "전체 확인"을 눌러야 전체 기록 페이지로 간다. ProfileMenu.tsx/
// TripMetaEditor.tsx의 "더보기" 드롭다운과 같은 클릭아웃사이드 패턴을 재사용한다.
export function HomeNotificationBell({ initialUnreadCount }: { initialUnreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  // 팔로우 알림을 누르면 알림 드롭다운은 닫고 상대 프로필 팝업을 연다
  const [profileNickname, setProfileNickname] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (!next || items !== null) return;

    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = res.ok ? await res.json() : [];
      setItems((data as NotificationItem[]).slice(0, POPUP_ITEM_LIMIT));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // 팝업을 여는 것만으로는 읽음 처리하지 않는다 — 클릭해서 이동하는 알림 하나만 읽음 처리한다.
  // 이동을 지연시키지 않도록 읽음 처리 요청은 완료를 기다리지 않는다(안읽음 배지는 다음
  // 페이지가 서버에서 새로 받아오는 카운트로 자연히 갱신됨).
  function onItemClick(n: NotificationItem) {
    setOpen(false);
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id }),
    }).catch(() => {});
    const href = notificationHref(n);
    if (href) router.push(href);
    else setProfileNickname(n.actor.nickname);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="알림"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <Bell className="h-5 w-5" />
        {initialUnreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {initialUnreadCount > 9 ? "9+" : initialUnreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-semibold text-neutral-900">알림</p>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              전체 확인
            </Link>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-neutral-400">불러오는 중...</p>
            ) : !items || items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-neutral-400">아직 알림이 없습니다.</p>
            ) : (
              <ul className="flex flex-col">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(n)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 ${
                        n.readAt ? "" : "bg-blue-50/60"
                      }`}
                    >
                      <Avatar url={n.actor.avatarUrl} nickname={n.actor.nickname} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-neutral-800">
                          <span className="font-semibold">{n.actor.nickname}</span>
                          {notificationText(n)}
                        </p>
                        <p className="text-xs text-neutral-400">{formatNotificationDate(n.createdAt)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {profileNickname ? (
        <UserProfileModal nickname={profileNickname} onClose={() => setProfileNickname(null)} />
      ) : null}
    </div>
  );
}
