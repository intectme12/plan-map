"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SendMessageButton } from "@/components/SendMessageButton";

type UserResult = {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
  _count: { trips: number };
};

export function UserSearchBrowser() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  // 검색어가 비어있으면(탭에 막 들어왔을 때 포함) "다른 사람에게 내 여행 목록 보이기"를 켠
  // 회원을 서버가 자동으로 돌려준다 — 그래서 빈 검색어일 때 결과를 비우지 않고 그대로 조회한다.
  // 타이핑 중엔 기존처럼 300ms 디바운스, 빈 검색어(최초 진입/지우기)는 바로 조회한다.
  useEffect(() => {
    const term = q.trim();
    const timer = setTimeout(
      async () => {
        setLoading(true);
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(term)}`);
        const data: UserResult[] = res.ok ? await res.json() : [];
        setLoading(false);
        setUsers(data);
      },
      term ? 300 : 0
    );
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="flex flex-col gap-3">
      <input
        placeholder="닉네임으로 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />

      {!q.trim() && !loading && users.length > 0 ? (
        <p className="text-sm text-neutral-500">여행 목록을 공개한 회원이에요.</p>
      ) : null}
      {loading ? (
        <p className="text-sm text-neutral-400">{q.trim() ? "검색 중..." : "불러오는 중..."}</p>
      ) : null}
      {!loading && users.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {q.trim() ? "검색 결과가 없습니다." : "아직 여행 목록을 공개한 회원이 없습니다."}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
          >
            <Link href={`/users/${u.nickname}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar url={u.avatarUrl} nickname={u.nickname} size={40} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{u.nickname}</p>
                {u.bio ? <p className="truncate text-sm text-neutral-500">{u.bio}</p> : null}
              </div>
              <span className="flex-none text-sm text-neutral-400">여행 {u._count.trips}개</span>
            </Link>
            <SendMessageButton userId={u.id} className="h-auto flex-none rounded-md px-3 py-1.5 text-xs" />
          </li>
        ))}
      </ul>
    </div>
  );
}
