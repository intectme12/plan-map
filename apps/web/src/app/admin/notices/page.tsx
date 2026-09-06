import Link from "next/link";
import { listNotices } from "@/lib/services/admin/notices";
import { NoticeDeleteButton } from "./NoticeDeleteButton";

export default async function AdminNoticesPage() {
  const notices = await listNotices();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">공지사항</h1>
        <Link
          href="/admin/notices/new"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
        >
          새 공지 작성
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {notices.map((n) => (
          <li
            key={n.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 p-3"
          >
            <Link href={`/admin/notices/${n.id}`} className="flex flex-col">
              <span className="text-sm font-semibold">{n.title}</span>
              <span className="text-xs text-neutral-500">
                {n.createdAt.toLocaleDateString("ko-KR")}
              </span>
            </Link>
            <NoticeDeleteButton noticeId={n.id} />
          </li>
        ))}
        {notices.length === 0 ? (
          <p className="text-sm text-neutral-500">등록된 공지사항이 없습니다.</p>
        ) : null}
      </ul>
    </div>
  );
}
