import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTrip } from "@/lib/services/trips";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";
import { PlaceForm } from "./PlaceForm";
import { PlaceList } from "./PlaceList";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { tripId } = await params;
  const trip = await getTrip(user.id, tripId);
  if (!trip) notFound();

  const points = trip.places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }));

  return (
    <main className="relative h-screen w-full overflow-hidden">
      {/* 지도가 바탕: 화면 전체를 채우고, 타임라인 패널이 그 위 오른쪽에 붙는다 */}
      <div className="absolute inset-0">
        <KakaoMapCanvas points={points} />
      </div>

      <Link
        href="/trips"
        className="absolute left-4 top-4 z-10 rounded-md bg-white px-3 py-1.5 text-sm font-semibold shadow"
      >
        ← 내 여행계획
      </Link>

      <aside className="absolute right-0 top-0 z-10 flex h-full w-[380px] flex-col border-l border-neutral-200 bg-white shadow-xl">
        <header className="border-b border-neutral-200 p-4">
          <h1 className="text-lg font-bold">{trip.name}</h1>
          <p className="text-sm text-neutral-500">
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · {trip.personnel}명
          </p>
        </header>

        <PlaceForm tripId={trip.id} />

        <div className="min-h-0 flex-1">
          <PlaceList tripId={trip.id} places={trip.places} />
        </div>
      </aside>
    </main>
  );
}
