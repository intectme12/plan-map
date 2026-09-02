import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listTrips } from "@/lib/services/trips";
import { LogoutButton } from "@/components/LogoutButton";
import { TripCreateForm } from "./TripCreateForm";
import { TripList } from "./TripList";

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

      <TripList trips={trips} />
    </main>
  );
}
