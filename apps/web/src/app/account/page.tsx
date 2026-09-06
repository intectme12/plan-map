import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AccountForm } from "./AccountForm";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 정보 수정</h1>
        <Link href="/trips" className="text-sm text-neutral-500 hover:underline">
          ← 대시보드
        </Link>
      </header>
      <p className="text-sm text-neutral-500">{user.email}</p>
      <AccountForm initialNickname={user.nickname} />
    </main>
  );
}
