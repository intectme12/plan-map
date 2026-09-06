import { NoticeForm } from "../NoticeForm";

export default function NewNoticePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">새 공지 작성</h1>
      <NoticeForm />
    </div>
  );
}
