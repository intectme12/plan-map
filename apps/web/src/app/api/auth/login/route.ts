import { NextResponse } from "next/server";
import { APIError } from "better-auth";
import { headers } from "next/headers";
import { auth } from "@/lib/betterAuth";
import { loginSchema } from "@/lib/validation";
import { handleRouteError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { email, password } = loginSchema.parse(body);

    let user;
    try {
      const result = await auth.api.signInEmail({
        body: { email, password },
        headers: await headers(),
      });
      user = result.user;
    } catch (err) {
      if (err instanceof APIError) {
        return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
      }
      throw err;
    }

    return NextResponse.json({ id: user.id, email: user.email, nickname: user.name });
  } catch (err) {
    return handleRouteError(err);
  }
}
