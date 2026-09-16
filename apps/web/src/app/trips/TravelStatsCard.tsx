import Link from "next/link";
import { Luggage } from "lucide-react";

export function TravelStatsCard({
  tripCount,
  savedPlaceCount,
  visitedRegionCount,
}: {
  tripCount: number;
  savedPlaceCount: number;
  visitedRegionCount: number;
}) {
  const stats = [
    { label: "내 여행계획", value: tripCount },
    { label: "저장한 장소", value: savedPlaceCount },
    { label: "방문한 지역", value: visitedRegionCount },
  ];

  return (
    <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-neutral-900">
          <Luggage className="h-4 w-4 text-blue-600" /> 여행 통계
        </h2>
        <Link href="/saved-places" className="text-xs font-medium text-neutral-500 hover:text-blue-600">
          더보기 →
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xl font-bold text-neutral-900">{stat.value}</p>
            <p className="mt-0.5 text-[11px] text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
