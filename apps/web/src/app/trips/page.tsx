import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { listTrips } from "@/lib/services/trips";
import { LogoutButton } from "@/components/LogoutButton";
import { TripsTabs } from "./TripsTabs";

export default async function TripsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const trips = await listTrips(user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-end gap-2">
        {isAdmin(user) ? (
          <Link
            href="/admin"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            관리자
          </Link>
        ) : null}
        <Link
          href="/account"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
        >
          내 정보
        </Link>
        <LogoutButton />
      </div>

      <header>
        <h1 className="text-xl font-bold">내 여행계획</h1>
        <p className="text-sm text-neutral-500">{user.nickname}님</p>
      </header>

      <TripsTabs trips={trips} />
    </main>
  );
}
