import Link from "next/link";
import { Sparkles, Map, ClipboardList } from "lucide-react";

export function QuickStartCards({ mapHref, aiPlanHref }: { mapHref: string; aiPlanHref: string }) {
  const items = [
    {
      href: aiPlanHref,
      icon: Sparkles,
      title: "AI 여행계획",
      desc: "AI가 추천하는 나만의 여행 코스",
      iconBg: "bg-violet-50 text-violet-600",
    },
    {
      href: mapHref,
      icon: Map,
      title: "지도에서 찾기",
      desc: "지도에서 여행지를 탐색해요",
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      href: "/trips",
      icon: ClipboardList,
      title: "내 여행계획",
      desc: "저장한 여행 계획을 관리해요",
      iconBg: "bg-green-50 text-green-600",
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-neutral-900">빠른 시작</h2>
      <div className="grid grid-cols-1 gap-3">
        {items.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_2px_12px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_6px_20px_rgba(15,23,42,0.1)]"
          >
            <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${item.iconBg}`}>
              <item.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-neutral-900">{item.title}</span>
              <span className="block truncate text-xs text-neutral-500">{item.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
