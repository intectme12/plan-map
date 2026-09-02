import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listTrips } from "@/lib/services/trips";
import { LogoutButton } from "@/components/LogoutButton";
import { TripCreateForm } from "./TripCreateForm";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export default async function TripsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const trips = await listTrips(user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">내 여행계획</h1>
          <p className="text-sm text-neutral-500">{user.nickname}님</p>
        </div>
        <LogoutButton />
      </header>

      <TripCreateForm />

      {trips.length === 0 ? (
        <p className="text-sm text-neutral-500">아직 만든 여행계획이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trips/${trip.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:bg-neutral-50"
              >
                <div>
                  <p className="font-semibold">{trip.name}</p>
                  <p className="text-sm text-neutral-500">
                    {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · {trip.personnel}명
                  </p>
                </div>
                <span className="text-sm text-neutral-400">장소 {trip._count.places}개</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
