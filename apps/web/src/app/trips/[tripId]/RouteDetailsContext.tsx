"use client";

import { createContext, useContext } from "react";

// 장소 쌍별 이동정보. 키는 `${fromId}-${toId}`. 값이 있는데 durationSec/distanceM이 비어 있으면
// "조회는 끝났지만 불러올 수 없음", 키 자체가 없으면 "아직 조회 중"을 뜻한다.
export type RouteDetail = {
  path?: { lat: number; lng: number }[];
  durationSec?: number;
  distanceM?: number;
  fareWon?: number | null;
};

// TripWorkspace/SharedTripView가 지도·요약용으로 이미 한 번 조회한 결과를 타임라인의
// RouteSegmentRow도 그대로 쓰게 해서, 같은 구간을 두 번 요청(=카카오 호출 2회)하지 않도록 함
export const RouteDetailsContext = createContext<Record<string, RouteDetail>>({});

export function useRouteDetail(fromPlaceId: string, toPlaceId: string): RouteDetail | undefined {
  return useContext(RouteDetailsContext)[`${fromPlaceId}-${toPlaceId}`];
}
