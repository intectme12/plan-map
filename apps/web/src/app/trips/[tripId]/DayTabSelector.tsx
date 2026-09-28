"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS } from "./days";

const PAGE_SIZE = 5;

// 타임라인/사진/후기 탭이 공유하는 날짜 선택 pill 행 — 한 번에 하나의 날짜만 선택된다
// (여러 날짜를 동시에 펼치던 예전 아코디언과 달리 진짜 탭 방식). 여행 기간이 길어 날짜가
// PAGE_SIZE(5)개를 넘으면 한 번에 5개씩만 보여주고 좌우 화살표로 페이지를 넘긴다.
export function DayTabSelector({
  days,
  selectedDay,
  onSelect,
}: {
  days: Date[];
  selectedDay: number;
  onSelect: (dayIndex: number) => void;
}) {
  const [page, setPage] = useState(() => Math.floor(selectedDay / PAGE_SIZE));
  // 이 값이 selectedDay와 어긋나 있으면(=외부에서 selectedDay가 바뀜) 렌더 중에 즉시 페이지를
  // 맞춘다 — effect로 하면 한 프레임 늦게 반영되고 렌더가 한 번 더 발생해서, React가 권장하는
  // "렌더 중 state 조정" 패턴을 쓴다. 화살표로 페이지만 넘기는 동안은 selectedDay가 그대로라
  // 안 끼어든다.
  const [lastSyncedDay, setLastSyncedDay] = useState(selectedDay);
  if (selectedDay !== lastSyncedDay) {
    setLastSyncedDay(selectedDay);
    setPage(Math.floor(selectedDay / PAGE_SIZE));
  }

  const pageCount = Math.ceil(days.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(pageCount - 1, 0));
  const start = safePage * PAGE_SIZE;
  const visibleDays = days.slice(start, start + PAGE_SIZE);
  const hasPrev = safePage > 0;
  const hasNext = start + PAGE_SIZE < days.length;

  return (
    <div className="px-3 pt-3 pb-2">
      <div className="flex items-center gap-1.5">
        {hasPrev ? (
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            aria-label="이전 날짜"
            className="flex h-9 w-7 flex-none items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}

        {visibleDays.map((date, i) => {
          const dayIndex = start + i;
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

        {hasNext ? (
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            aria-label="다음 날짜"
            className="flex h-9 w-7 flex-none items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
