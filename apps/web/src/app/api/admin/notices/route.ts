import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { createNotice } from "@/lib/services/admin/notices";
import { createNoticeSchema } from "@/lib/validation";
import { unauthorized, notFound, handleRouteError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user)) return notFound();

    const body = await request.json().catch(() => null);
    const data = createNoticeSchema.parse(body);
    const notice = await createNotice(user.id, data);
    return NextResponse.json(notice, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
