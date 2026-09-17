import Link from "next/link";
import { Sparkles } from "lucide-react";

// 기존 "✨ AI로 일정 가져오기" 링크(/import)를 그대로 가리키는, 히어로 배너용 카드 리스타일.
// 연결되는 기능/라우트는 전혀 바뀌지 않는다.
export function AIAssistantCard({ href }: { href: string }) {
  return (
    <div className="flex h-full min-h-[220px] w-full flex-col justify-between rounded-3xl bg-gradient-to-br from-blue-600 to-violet-600 p-5 text-white shadow-sm sm:min-h-[250px]">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <Sparkles className="h-4 w-4" /> AI 여행 도우미
        </p>
        <p className="mt-1 text-xs text-white/85">이 여행에 어울리는 일정을 AI가 추천해드려요.</p>
      </div>
      <Link
        href={href}
        className="flex items-center justify-center gap-1 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
      >
        AI 일정 추천받기 →
      </Link>
    </div>
  );
}
