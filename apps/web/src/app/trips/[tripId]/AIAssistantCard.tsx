import Link from "next/link";
import { Sparkles } from "lucide-react";

// 기존 "✨ AI로 일정 가져오기" 링크(/import)를 그대로 가리키는, 히어로 배너용 카드 리스타일.
// 연결되는 기능/라우트는 전혀 바뀌지 않는다. 이제 지도 옆 히어로와 나란히 배치되지 않고
// 타임라인 패널(aside) 안 상단에 얹히는 배지형 카드라, 높이를 강제하지 않고 내용만큼만 차지한다.
export function AIAssistantCard({ href }: { href: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-3.5 text-white shadow-sm">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <Sparkles className="h-4 w-4" /> AI 여행 도우미
        </p>
        <p className="mt-0.5 truncate text-xs text-white/85">이 여행에 어울리는 일정을 AI가 추천해드려요.</p>
      </div>
      <Link
        href={href}
        className="flex flex-none items-center justify-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
      >
        추천받기 →
      </Link>
    </div>
  );
}
