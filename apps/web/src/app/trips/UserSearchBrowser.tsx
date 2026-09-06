"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";

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

  useEffect(() => {
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data: UserResult[] = res.ok ? await res.json() : [];
      setLoading(false);
      setUsers(data);
    }, 300);
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

      {!q.trim() ? (
        <p className="text-sm text-neutral-500">닉네임으로 검색해보세요.</p>
      ) : null}
      {q.trim() && loading ? <p className="text-sm text-neutral-400">검색 중...</p> : null}
      {q.trim() && !loading && users.length === 0 ? (
        <p className="text-sm text-neutral-500">검색 결과가 없습니다.</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li key={u.id}>
            <Link
              href={`/users/${u.nickname}`}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
            >
              <Avatar url={u.avatarUrl} nickname={u.nickname} size={40} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{u.nickname}</p>
                {u.bio ? <p className="truncate text-sm text-neutral-500">{u.bio}</p> : null}
              </div>
              <span className="flex-none text-sm text-neutral-400">여행 {u._count.trips}개</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
