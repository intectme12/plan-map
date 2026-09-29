import type { PlaceEntry } from "./types";

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 지도 이동경로 선/날짜 아코디언에서 공유하는 날짜별 색상 팔레트
export const DAY_COLORS = ["#2F6FED", "#FF7A45", "#16A34A", "#D97706", "#8B5CF6", "#DC2626"];

export function dayColor(dayIndex: number): string {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

// 여행 시작일~종료일까지의 날짜 목록. 최소 1일(당일치기)은 항상 포함
export function getTripDays(startDate: string | Date, endDate: string | Date): Date[] {
  const start = startOfDay(new Date(startDate));
  const end = startOfDay(new Date(endDate));
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days.length > 0 ? days : [start];
}

// scheduledAt이 여행 기간 중 어느 날짜와도 안 맞거나(미배정) 값이 없으면 1일차로 묶는다
export function dayIndexForPlace(place: Pick<PlaceEntry, "scheduledAt">, days: Date[]): number {
  if (place.scheduledAt) {
    const scheduled = new Date(place.scheduledAt);
    const idx = days.findIndex((day) => isSameDay(day, scheduled));
    if (idx >= 0) return idx;
  }
  return 0;
}

// 통계 집계(서버)처럼 scheduledAt만 가진 가벼운 객체도 묶을 수 있게 제네릭으로 둔다
export function groupByDay<T extends Pick<PlaceEntry, "scheduledAt">>(items: T[], days: Date[]): T[][] {
  const groups: T[][] = days.map(() => []);
  for (const place of items) {
    const idx = dayIndexForPlace(place, days);
    (groups[idx] ?? groups[0]).push(place);
  }
  return groups;
}

export function formatDayLabel(date: Date, dayNumber: number): string {
  return `${dayNumber}일차 · ${date.getMonth() + 1}/${date.getDate()} (${WEEKDAYS[date.getDay()]})`;
}

// AI가 추출한 장소마다 "몇 일차"인지(dayIndex, 0-based)를 최종 확정한다. LLM이 준 값이 있으면
// 여행 일수 범위로 clamp해서 그대로 쓰고, 모르면(null) 원문 등장 순서를 유지한 채 날짜 수만큼
// 균등하게 나눠 채운다(예: 6곳·3일이면 0,0,1,1,2,2). AiPlanFlow.tsx(기존/신규 여행 플로우 공용)에서 씀.
export function assignDayIndexes(dayIndexes: (number | null)[], dayCount: number): number[] {
  const safeDayCount = Math.max(1, dayCount);
  const unknownCount = dayIndexes.filter((d) => d == null).length;
  const perDay = Math.max(1, Math.ceil(unknownCount / safeDayCount));

  let unknownSeen = 0;
  return dayIndexes.map((d) => {
    if (d != null) return Math.min(Math.max(d, 0), safeDayCount - 1);
    const idx = Math.min(Math.floor(unknownSeen / perDay), safeDayCount - 1);
    unknownSeen += 1;
    return idx;
  });
}
