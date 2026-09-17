import Link from "next/link";
import { Sparkles } from "lucide-react";

// 기존 "✨ AI로 일정 가져오기" 링크(/import)를 그대로 가리키는, 히어로 배너용 카드 리스타일.
// 연결되는 기능/라우트는 전혀 바뀌지 않는다.
export function AIAssistantCard({ href }: { href: string }) {
  return (
    <div className="w-full max-w-xs rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur sm:w-72">
      <p className="flex items-center gap-1.5 text-sm font-bold text-neutral-900">
        <Sparkles className="h-4 w-4 text-blue-600" /> AI 여행 도우미
      </p>
      <p className="mt-1 text-xs text-neutral-500">이 여행에 어울리는 일정을 AI가 추천해드려요.</p>
      <Link
        href={href}
        className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        AI 일정 추천받기 →
      </Link>
    </div>
  );
}
