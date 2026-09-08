import { NextResponse } from "next/server";
import { APIError } from "better-auth";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { auth } from "@/lib/betterAuth";
import { changePasswordSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    try {
      await auth.api.changePassword({
        body: { currentPassword, newPassword },
        headers: await headers(),
      });
    } catch (err) {
      if (err instanceof APIError) {
        return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });
      }
      throw err;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
