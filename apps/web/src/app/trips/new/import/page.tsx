import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AiPlanFlow } from "@/components/ai-plan/AiPlanFlow";

// 여행이 아직 없는 상태에서 AI로 새 여행을 만드는 진입점. "new"는 정적 세그먼트라
// Next.js가 /trips/[tripId]/import 보다 먼저 매칭하므로 라우트가 충돌하지 않는다.
export default async function AiNewTripPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <main className="mx-auto flex h-screen w-full max-w-6xl flex-col overflow-hidden bg-[#F8FAFC]">
      <header className="flex flex-none flex-col gap-1 border-b border-[#E2E8F0] bg-white px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/trips" className="text-sm text-[#64748B] hover:underline">
          ← 내 여행계획
        </Link>
        <h1 className="text-lg font-bold text-[#0F172A] sm:text-xl">AI 여행계획 만들기</h1>
        <p className="text-sm text-[#64748B]">
          여행지와 기간을 알려주고 후기나 일정 텍스트를 붙여넣으면, AI가 장소를 찾아 새 여행으로 만들어드려요.
        </p>
      </header>

      <div className="min-h-0 flex-1">
        <AiPlanFlow mode="new" />
      </div>
    </main>
  );
}
