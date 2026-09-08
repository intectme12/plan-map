import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { APIError } from "better-auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/betterAuth";
import { registerSchema } from "@/lib/validation";
import { handleRouteError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { email, password, nickname } = registerSchema.parse(body);

    const [existingEmail, existingNickname] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { nickname } }),
    ]);
    if (existingEmail) {
      return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
    }
    if (existingNickname) {
      return NextResponse.json({ error: "이미 사용 중인 닉네임입니다." }, { status: 409 });
    }

    let user;
    try {
      const result = await auth.api.signUpEmail({
        body: { name: nickname, email, password },
        headers: await headers(),
      });
      user = result.user;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = (err.meta?.target as string[] | undefined)?.[0];
        const message =
          target === "nickname" ? "이미 사용 중인 닉네임입니다." : "이미 가입된 이메일입니다.";
        return NextResponse.json({ error: message }, { status: 409 });
      }
      if (err instanceof APIError) {
        return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json(
      { id: user.id, email: user.email, nickname: user.name },
      { status: 201 }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
