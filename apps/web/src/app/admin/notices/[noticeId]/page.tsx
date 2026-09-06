import { notFound as notFoundPage } from "next/navigation";
import { getNotice } from "@/lib/services/admin/notices";
import { NoticeForm } from "../NoticeForm";

export default async function EditNoticePage({
  params,
}: {
  params: Promise<{ noticeId: string }>;
}) {
  const { noticeId } = await params;
  const notice = await getNotice(noticeId);
  if (!notice) notFoundPage();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">공지 수정</h1>
      <NoticeForm noticeId={notice.id} initialTitle={notice.title} initialContent={notice.content} />
    </div>
  );
}
