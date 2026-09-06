import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { changePassword } from "@/lib/services/users";
import { changePasswordSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);
    await changePassword(user.id, currentPassword, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
