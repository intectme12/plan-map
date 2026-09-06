import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/services/admin/users";
import { UserActions } from "./UserActions";

export default async function AdminUsersPage() {
  const me = await getCurrentUser();
  const users = await listUsers();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">회원관리</h1>
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-3 py-2">이메일</th>
              <th className="px-3 py-2">닉네임</th>
              <th className="px-3 py-2">권한</th>
              <th className="px-3 py-2">여행 수</th>
              <th className="px-3 py-2">가입일</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-neutral-100">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.nickname}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">{u._count.trips}</td>
                <td className="px-3 py-2">{u.createdAt.toLocaleDateString("ko-KR")}</td>
                <td className="px-3 py-2">
                  <UserActions userId={u.id} role={u.role} isSelf={u.id === me?.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
