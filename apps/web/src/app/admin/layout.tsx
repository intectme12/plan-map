import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user)) redirect("/trips");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl gap-6 px-4 py-8">
      <nav className="flex w-40 shrink-0 flex-col gap-1 text-sm">
        <p className="px-3 pb-2 text-xs font-semibold text-neutral-400">관리자</p>
        <Link href="/admin/users" className="rounded-md px-3 py-2 hover:bg-neutral-100">
          회원관리
        </Link>
        <Link href="/admin/notices" className="rounded-md px-3 py-2 hover:bg-neutral-100">
          공지사항
        </Link>
        <Link
          href="/trips"
          className="mt-4 rounded-md px-3 py-2 text-neutral-500 hover:bg-neutral-100"
        >
          ← 대시보드
        </Link>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
