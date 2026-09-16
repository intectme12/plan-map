import Link from "next/link";
import { MapPin } from "lucide-react";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";

type MapPoint = { id: string; name: string; lat: number; lng: number; category?: string | null };

export function AllTripsMapWidget({
  points,
  tripCount,
  placeCount,
}: {
  points: MapPoint[];
  tripCount: number;
  placeCount: number;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-900">내 여행 지도</h2>
        <Link href="/saved-places" className="text-xs font-medium text-neutral-500 hover:text-blue-600">
          전체보기 →
        </Link>
      </div>

      {points.length > 0 ? (
        <div className="relative h-72 overflow-hidden rounded-2xl border border-neutral-100 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
          <KakaoMapCanvas points={points} />

          <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-xl bg-white/95 p-3 shadow-lg backdrop-blur">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-sm text-neutral-700">
              여행 <span className="font-semibold">{tripCount}</span>개 · 장소{" "}
              <span className="font-semibold">{placeCount}</span>곳
            </span>
          </div>
        </div>
      ) : (
        <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 text-sm text-neutral-400">
          <MapPin className="h-6 w-6" />
          아직 지도에 표시할 장소가 없어요.
        </div>
      )}
    </section>
  );
}
