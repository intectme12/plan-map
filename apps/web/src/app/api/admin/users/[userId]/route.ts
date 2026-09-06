import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateUserRole, deleteUser } from "@/lib/services/admin/users";
import { updateUserRoleSchema } from "@/lib/validation";
import { unauthorized, notFound, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user)) return notFound();

    const { userId } = await params;
    if (userId === user.id) {
      return NextResponse.json(
        { error: "본인 계정 권한은 관리자 페이지에서 변경할 수 없습니다." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const { role } = updateUserRoleSchema.parse(body);
    const ok = await updateUserRole(userId, role);
    if (!ok) return notFound("회원을 찾을 수 없습니다.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return notFound();

  const { userId } = await params;
  if (userId === user.id) {
    return NextResponse.json({ error: "본인 계정은 삭제할 수 없습니다." }, { status: 400 });
  }

  const ok = await deleteUser(userId);
  if (!ok) return notFound("회원을 찾을 수 없습니다.");
  return NextResponse.json({ ok: true });
}
