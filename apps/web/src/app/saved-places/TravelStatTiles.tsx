import { Bookmark, Map as MapIcon, MapPin, Route, Wallet } from "lucide-react";

type Tile = {
  label: string;
  icon: React.ReactNode;
  value: string | null; // null이면 "—"(집계할 기록이 없음 — 0과 구분)
  unit?: string;
  hint?: string;
};

function formatKm(m: number) {
  const km = m / 1000;
  return km < 100 ? km.toFixed(1) : Math.round(km).toLocaleString();
}

// 저장한 장소 페이지 상단 통계 — 항목마다 네모난 타일(아이콘 · 큰 숫자+단위 · 라벨).
// /trips 사이드바의 TravelStatsCard(한 카드 안 3칸)와는 별개 — 이 페이지만 5개 항목을 넓게 보여준다.
export function TravelStatTiles({
  tripCount,
  savedPlaceCount,
  visitedRegionCount,
  totalDistanceM,
  totalSpentWon,
  expenseCount,
}: {
  tripCount: number;
  savedPlaceCount: number;
  visitedRegionCount: number;
  totalDistanceM: number;
  totalSpentWon: number;
  expenseCount: number;
}) {
  const tiles: Tile[] = [
    { label: "여행계획", icon: <MapIcon className="h-4 w-4" />, value: tripCount.toLocaleString(), unit: "개" },
    { label: "저장한 장소", icon: <Bookmark className="h-4 w-4" />, value: savedPlaceCount.toLocaleString(), unit: "개" },
    { label: "여행 지역", icon: <MapPin className="h-4 w-4" />, value: visitedRegionCount.toLocaleString(), unit: "곳" },
    {
      label: "총 이동거리",
      icon: <Route className="h-4 w-4" />,
      // 경로는 여행 상세에서 조회될 때 저장되므로, 조회된 구간이 하나도 없으면 0km가 아니라 "—"
      value: totalDistanceM > 0 ? formatKm(totalDistanceM) : null,
      unit: "km",
      hint: "여행 상세에서 경로를 조회한 구간 기준",
    },
    {
      label: "총 여행 경비",
      icon: <Wallet className="h-4 w-4" />,
      value: expenseCount > 0 ? totalSpentWon.toLocaleString() : null,
      unit: "원",
      hint: expenseCount > 0 ? undefined : "기록된 지출이 없어요",
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile, i) => (
        <li
          key={tile.label}
          title={tile.hint}
          className={`rounded-xl border border-slate-200 bg-white px-4 py-3.5 ${
            // 모바일 2열에서 마지막(5번째) 타일이 혼자 반 칸만 차지하지 않도록 전체 폭으로
            i === tiles.length - 1 ? "col-span-2 sm:col-span-1" : ""
          }`}
        >
          <span className="text-blue-600">{tile.icon}</span>
          <p className="mt-2 truncate text-xl font-bold text-slate-900 tabular-nums">
            {tile.value === null ? (
              <span aria-label="기록 없음">—</span>
            ) : (
              <>
                {tile.value}
                {tile.unit ? <span className="ml-0.5 text-base font-semibold">{tile.unit}</span> : null}
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{tile.label}</p>
        </li>
      ))}
    </ul>
  );
}
