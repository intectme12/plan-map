import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { updateNotice, deleteNotice } from "@/lib/services/admin/notices";
import { updateNoticeSchema } from "@/lib/validation";
import { unauthorized, notFound, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ noticeId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user)) return notFound();

    const { noticeId } = await params;
    const body = await request.json().catch(() => null);
    const data = updateNoticeSchema.parse(body);
    const ok = await updateNotice(noticeId, data);
    if (!ok) return notFound("공지사항을 찾을 수 없습니다.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return notFound();

  const { noticeId } = await params;
  const ok = await deleteNotice(noticeId);
  if (!ok) return notFound("공지사항을 찾을 수 없습니다.");
  return NextResponse.json({ ok: true });
}
