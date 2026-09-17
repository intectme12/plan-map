import { formatDayLabel, dayColor } from "./days";

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={`flex-none text-neutral-400 transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 타임라인/사진/후기 탭과 공유 열람 화면 전부가 공유하는 날짜 헤더+테두리 셸.
// 펼쳤을 때 안쪽 내용(장소 목록/사진 그리드/후기 등)은 화면마다 달라서 children으로 받는다.
// 겉보기엔 날짜 탭(Day 9.07 | 9.08 | 9.09)처럼 보이지만, 실제 개폐 상태는 여러 날짜를
// 동시에 열 수 있는 기존 아코디언(Set) 그대로다 — 다른 날짜로 장소를 드래그해서 옮기려면
// 두 날짜가 동시에 화면에 펼쳐져 있어야 하기 때문(기능 변경 금지).
export function DayAccordionSection({
  dayIndex,
  date,
  dayNumber,
  count,
  open,
  onToggle,
  children,
}: {
  dayIndex: number;
  date: Date;
  dayNumber: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const label = formatDayLabel(date, dayNumber).split(" · ")[1] ?? formatDayLabel(date, dayNumber);

  return (
    <div className={open ? "" : undefined}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
          open
            ? "bg-blue-600 text-white shadow-sm"
            : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
        }`}
      >
        <span
          className="h-2 w-2 flex-none rounded-full"
          style={{ background: open ? "white" : dayColor(dayIndex) }}
        />
        <span>{label}</span>
        <span className={`flex-none text-xs font-normal ${open ? "text-white/80" : "text-neutral-400"}`}>
          {count}곳
        </span>
      </button>
      {open ? <div className="mt-2 rounded-xl border border-neutral-200 bg-white">{children}</div> : null}
    </div>
  );
}
