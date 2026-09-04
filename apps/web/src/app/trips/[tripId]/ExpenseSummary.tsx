import { useState } from "react";

type CategoryTotal = { category: string; amount: number };
type PlaceExpense = { id: string; amount: number; category: string; memo: string | null };
type PlaceTotal = { id: string; name: string; total: number; expenses: PlaceExpense[] };

const CHART_COLORS = ["#2F6FED", "#FF7A45", "#16A34A", "#D97706", "#8B5CF6", "#DC2626"];

export function ExpenseSummary({
  total,
  byCategory,
  places,
  selectedPlaceId,
  onSelectPlace,
}: {
  total: number;
  byCategory: CategoryTotal[];
  places: PlaceTotal[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleClickPlace(p: PlaceTotal) {
    onSelectPlace(p.id);
    setExpandedId((prev) => (prev === p.id ? null : p.id));
  }

  const segments = byCategory.reduce<{ start: number; end: number }[]>((acc, c) => {
    const start = acc.length > 0 ? acc[acc.length - 1].end : 0;
    acc.push({ start, end: start + (c.amount / total) * 360 });
    return acc;
  }, []);
  const gradientStops = segments.map(
    (s, i) => `${CHART_COLORS[i % CHART_COLORS.length]} ${s.start}deg ${s.end}deg`
  );

  const placesWithExpense = places.filter((p) => p.total > 0);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <p className="text-xs text-neutral-500">여행 총 지출</p>
        <p className="text-3xl font-bold tabular-nums">{total.toLocaleString()}원</p>
      </div>

      {byCategory.length === 0 ? (
        <p className="text-sm text-neutral-400">
          아직 입력된 지출이 없습니다. 타임라인 카드에서 장소별 지출을 입력해보세요.
        </p>
      ) : (
        <div className="flex items-center gap-6">
          <div
            className="h-32 w-32 flex-none rounded-full"
            style={{ background: `conic-gradient(${gradientStops.join(", ")})` }}
          />
          <ul className="flex flex-1 flex-col gap-1.5 text-sm">
            {byCategory.map((c, i) => (
              <li key={c.category} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  {c.category}
                </span>
                <span className="tabular-nums text-neutral-600">{c.amount.toLocaleString()}원</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {placesWithExpense.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold text-neutral-500">장소별 지출</p>
          <ul className="flex flex-col gap-1">
            {placesWithExpense.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handleClickPlace(p)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-50 ${
                    selectedPlaceId === p.id ? "bg-blue-50" : ""
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="flex-none tabular-nums text-neutral-600">
                    {p.total.toLocaleString()}원
                  </span>
                </button>

                {expandedId === p.id ? (
                  <ul className="ml-2 mt-1 flex flex-col gap-1 border-l border-neutral-200 py-0.5 pl-2">
                    {p.expenses.map((exp) => (
                      <li key={exp.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="flex-none rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                            {exp.category}
                          </span>
                          {exp.memo ? (
                            <span className="truncate text-neutral-500">{exp.memo}</span>
                          ) : null}
                        </span>
                        <span className="flex-none tabular-nums text-neutral-600">
                          {exp.amount.toLocaleString()}원
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
