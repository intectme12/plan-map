"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";

const PAGE_SIZE = 20;

export type FollowListUser = {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
};

export function FollowUserList({
  apiPath,
  initialUsers,
  emptyMessage,
}: {
  apiPath: string;
  initialUsers: FollowListUser[];
  emptyMessage: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialUsers.length === PAGE_SIZE);

  async function loadMore() {
    setLoading(true);
    const res = await fetch(`${apiPath}?cursor=${users.length}`);
    const data: FollowListUser[] = res.ok ? await res.json() : [];
    setLoading(false);
    setHasMore(data.length === PAGE_SIZE);
    setUsers((prev) => [...prev, ...data]);
  }

  if (users.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li key={u.id}>
            <Link
              href={`/users/${u.nickname}`}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
            >
              <Avatar url={u.avatarUrl} nickname={u.nickname} size={40} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{u.nickname}</p>
                {u.bio ? <p className="truncate text-sm text-neutral-500">{u.bio}</p> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {hasMore ? (
        <button
          onClick={loadMore}
          disabled={loading}
          className="self-center rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {loading ? "불러오는 중..." : "더 보기"}
        </button>
      ) : null}
    </div>
  );
}
