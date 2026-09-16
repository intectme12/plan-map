import Link from "next/link";
import { Sparkles } from "lucide-react";

export function AIPlanCTA({ href }: { href: string }) {
  return (
    <section className="mt-14">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-violet-600 px-6 py-10 text-white sm:px-12 sm:py-14">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white/90">
          <Sparkles className="h-4 w-4" /> AI가 추천하는 맞춤 여행 계획
        </p>
        <h2 className="mt-3 max-w-md text-2xl font-bold sm:text-3xl">어디로 갈지 고민되시나요?</h2>
        <p className="mt-3 max-w-md text-sm text-white/85">
          AI가 당신의 취향에 맞는 완벽한 여행 코스를 제안해드려요.
        </p>
        <Link
          href={href}
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
        >
          AI 여행계획 시작하기 →
        </Link>
      </div>
    </section>
  );
}
