import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTrip } from "@/lib/services/trips";
import { ImportFlow } from "./ImportFlow";

export default async function AiImportPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { tripId } = await params;
  const trip = await getTrip(user.id, tripId);
  if (!trip) notFound();

  return (
    <main className="mx-auto flex h-screen w-full max-w-6xl flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-neutral-200 p-4">
        <Link
          href={`/trips/${trip.id}`}
          className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold shadow-sm ring-1 ring-neutral-200"
        >
          ← {trip.name}
        </Link>
        <h1 className="text-lg font-bold">AI로 일정 가져오기</h1>
      </header>

      <div className="min-h-0 flex-1">
        <ImportFlow tripId={trip.id} />
      </div>
    </main>
  );
}
