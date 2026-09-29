import Link from "next/link";
import { Luggage } from "lucide-react";

function formatDistance(m: number) {
  if (m <= 0) return "0km";
  const km = m / 1000;
  return `${km < 100 ? km.toFixed(1) : Math.round(km).toLocaleString()}km`;
}

// 총 이동거리/사용한 금액은 /saved-places에서만 넘긴다 — 안 넘기면 기존 3칸 카드 그대로
export function TravelStatsCard({
  tripCount,
  savedPlaceCount,
  visitedRegionCount,
  totalDistanceM,
  totalSpentWon,
}: {
  tripCount: number;
  savedPlaceCount: number;
  visitedRegionCount: number;
  totalDistanceM?: number;
  totalSpentWon?: number;
}) {
  const stats: { label: string; value: string | number }[] = [
    { label: "내 여행계획", value: tripCount },
    { label: "저장한 장소", value: savedPlaceCount },
    { label: "방문한 지역", value: visitedRegionCount },
  ];
  if (totalDistanceM != null) stats.push({ label: "총 이동거리", value: formatDistance(totalDistanceM) });
  if (totalSpentWon != null) stats.push({ label: "사용한 금액", value: `₩${totalSpentWon.toLocaleString()}` });

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
      <div
        className={`mt-4 grid gap-2 text-center ${
          stats.length > 3 ? "grid-cols-3 gap-y-4 sm:grid-cols-5" : "grid-cols-3"
        }`}
      >
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <p className="truncate text-xl font-bold text-neutral-900">{stat.value}</p>
            <p className="mt-0.5 text-[11px] text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
