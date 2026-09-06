import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { setAvatar, removeAvatar } from "@/lib/services/avatars";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    const updated = await setAvatar(user.id, file);
    return NextResponse.json({ avatarUrl: updated.avatarUrl });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await removeAvatar(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
