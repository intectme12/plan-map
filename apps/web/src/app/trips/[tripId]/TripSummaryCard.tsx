import { MapPin } from "lucide-react";

// 이동 시간/거리는 지도에 표시되는 것과 같은 구간별 API 결과(다른 데이터 아님)를 합산한 값.
// 아직 구간 조회가 안 끝난 상태에서는 0으로 보이지 않도록 "-"로 표시한다.
export function TripSummaryCard({
  placeCount,
  totalDurationSec,
  totalDistanceM,
  totalExpense,
}: {
  placeCount: number;
  totalDurationSec: number;
  totalDistanceM: number;
  totalExpense: number;
}) {
  const stats = [
    { label: "방문 장소", value: `${placeCount}곳` },
    { label: "이동 시간", value: totalDurationSec > 0 ? `${Math.round(totalDurationSec / 60)}분` : "-" },
    { label: "총 이동", value: totalDistanceM > 0 ? `${(totalDistanceM / 1000).toFixed(1)}km` : "-" },
    { label: "예상 비용", value: `${totalExpense.toLocaleString()}원`, accent: true },
  ];

  return (
    <div className="m-2 rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      <p className="mb-3 flex items-center gap-1 text-xs font-semibold text-neutral-500">
        <MapPin className="h-3.5 w-3.5" /> 오늘 여행 요약
      </p>
      <div className="grid grid-cols-4 gap-2 text-center">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className={`text-base font-bold tabular-nums sm:text-lg ${stat.accent ? "text-amber-600" : "text-neutral-900"}`}>
              {stat.value}
            </p>
            <p className="mt-0.5 text-[10px] text-neutral-400 sm:text-[11px]">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
