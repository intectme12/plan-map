import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTrip } from "@/lib/services/trips";
import { AiPlanFlow } from "@/components/ai-plan/AiPlanFlow";

export default async function AiImportPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { tripId } = await params;
  const trip = await getTrip(user.id, tripId);
  if (!trip) notFound();

  return (
    <main className="mx-auto flex h-screen w-full max-w-6xl flex-col overflow-hidden bg-[#F8FAFC]">
      <header className="flex flex-none flex-col gap-1 border-b border-[#E2E8F0] bg-white px-4 py-3 sm:px-6 sm:py-4">
        <Link href={`/trips/${trip.id}`} className="text-sm text-[#64748B] hover:underline">
          ← {trip.name}
        </Link>
        <h1 className="text-lg font-bold text-[#0F172A] sm:text-xl">AI 여행계획 만들기</h1>
        <p className="text-sm text-[#64748B]">
          여행 후기나 일정 텍스트를 붙여넣으면 AI가 장소를 찾아 날짜별 일정으로 정리해드려요.
        </p>
      </header>

      <div className="min-h-0 flex-1">
        <AiPlanFlow
          mode="existing"
          tripId={trip.id}
          tripName={trip.name}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          personnel={trip.personnel}
        />
      </div>
    </main>
  );
}
