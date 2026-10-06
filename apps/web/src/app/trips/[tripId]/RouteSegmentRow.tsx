"use client";

import { useRouteDetail } from "./RouteDetailsContext";

// 이동정보는 직접 조회하지 않고 상위(TripWorkspace/SharedTripView)가 조회한 결과를 받아 표시만 한다
export function RouteSegmentRow({
  fromPlaceId,
  toPlaceId,
}: {
  fromPlaceId: string;
  toPlaceId: string;
}) {
  const detail = useRouteDetail(fromPlaceId, toPlaceId);
  const ready = detail?.distanceM != null && detail?.durationSec != null;

  return (
    <div className="flex items-center gap-x-3 gap-y-0.5 border-t border-dashed border-neutral-200 px-3 py-2 text-xs text-neutral-500">
      <span className="inline-flex items-center gap-1">
        🚗{" "}
        {!detail ? (
          "조회 중..."
        ) : !ready ? (
          <span className="text-neutral-400">이동정보를 불러올 수 없음</span>
        ) : (
          `${Math.round(detail.durationSec! / 60)}분 · ${(detail.distanceM! / 1000).toFixed(1)}km`
        )}
      </span>
      {ready && detail?.fareWon != null ? (
        <span className="inline-flex items-center gap-1">🚕 택시 {detail.fareWon.toLocaleString()}원</span>
      ) : null}
    </div>
  );
}
