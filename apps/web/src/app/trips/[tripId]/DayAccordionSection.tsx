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

// 타임라인/사진/후기 탭과 공유 열람 화면 전부가 공유하는 날짜 아코디언 헤더+테두리 셸.
// 펼쳤을 때 안쪽 내용(장소 목록/사진 그리드/후기 등)은 화면마다 달라서 children으로 받는다.
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
  return (
    <div className="rounded-md border border-neutral-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
      >
        <Chevron open={open} />
        <span
          className="h-2 w-2 flex-none rounded-full"
          style={{ background: dayColor(dayIndex) }}
        />
        <span className="flex-1">{formatDayLabel(date, dayNumber)}</span>
        {count > 0 ? (
          <span className="flex-none text-xs font-normal text-neutral-400">{count}곳</span>
        ) : null}
      </button>
      {open ? children : null}
    </div>
  );
}
