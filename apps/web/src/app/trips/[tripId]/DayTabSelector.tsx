import { WEEKDAYS } from "./days";

// 타임라인/사진/후기 탭이 공유하는 날짜 선택 pill 행 — 한 번에 하나의 날짜만 선택된다
// (여러 날짜를 동시에 펼치던 예전 아코디언과 달리 진짜 탭 방식).
export function DayTabSelector({
  days,
  selectedDay,
  onSelect,
}: {
  days: Date[];
  selectedDay: number;
  onSelect: (dayIndex: number) => void;
}) {
  return (
    <div className="px-3 pt-3 pb-2">
      <div className="flex gap-1.5">
        {days.map((date, dayIndex) => {
          const active = dayIndex === selectedDay;
          return (
            <button
              key={dayIndex}
              type="button"
              onClick={() => onSelect(dayIndex)}
              className={`flex flex-1 flex-col items-center rounded-xl border py-1.5 transition-colors ${
                active
                  ? "border-blue-200 bg-blue-50"
                  : "border-neutral-200 bg-white hover:bg-neutral-50"
              }`}
            >
              <span className={`text-xs font-bold ${active ? "text-blue-600" : "text-neutral-600"}`}>
                {date.getMonth() + 1}/{date.getDate()}
              </span>
              <span className={`mt-0.5 text-[11px] ${active ? "text-blue-500" : "text-neutral-400"}`}>
                {WEEKDAYS[date.getDay()]}요일
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
