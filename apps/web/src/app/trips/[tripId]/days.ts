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
export function dayIndexForPlace(place: PlaceEntry, days: Date[]): number {
  if (place.scheduledAt) {
    const scheduled = new Date(place.scheduledAt);
    const idx = days.findIndex((day) => isSameDay(day, scheduled));
    if (idx >= 0) return idx;
  }
  return 0;
}

export function groupByDay(items: PlaceEntry[], days: Date[]): PlaceEntry[][] {
  const groups: PlaceEntry[][] = days.map(() => []);
  for (const place of items) {
    const idx = dayIndexForPlace(place, days);
    (groups[idx] ?? groups[0]).push(place);
  }
  return groups;
}

export function formatDayLabel(date: Date, dayNumber: number): string {
  return `${dayNumber}일차 · ${date.getMonth() + 1}/${date.getDate()} (${WEEKDAYS[date.getDay()]})`;
}
