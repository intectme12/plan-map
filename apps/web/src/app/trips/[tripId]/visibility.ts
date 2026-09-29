import { Globe, Link2, Lock, type LucideIcon } from "lucide-react";

export type TripVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

// 서버(getSharedTrip 등)가 실제로 구분하는 공개 범위 3가지 — 여행 상단 상태 배지와 공유 팝업이 같이 쓴다.
// 공유 링크(/trips/shared/[id])는 로그인이 필요해서 "링크를 가진 회원"으로 안내한다.
export const VISIBILITY_META: Record<TripVisibility, { label: string; description: string; icon: LucideIcon }> = {
  PRIVATE: { label: "비공개", description: "나와 초대한 회원만 볼 수 있어요", icon: Lock },
  UNLISTED: { label: "링크 공유", description: "링크를 가진 Triply 회원이 볼 수 있어요", icon: Link2 },
  PUBLIC: { label: "전체 공개", description: "둘러보기·홈에 노출돼 모든 회원이 볼 수 있어요", icon: Globe },
};

export const VISIBILITY_ORDER: TripVisibility[] = ["PRIVATE", "UNLISTED", "PUBLIC"];

export function toVisibility(value: string): TripVisibility {
  return value === "UNLISTED" || value === "PUBLIC" ? value : "PRIVATE";
}
