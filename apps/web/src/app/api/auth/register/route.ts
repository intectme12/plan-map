import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
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

    const passwordHash = await hashPassword(password);
    let user;
    try {
      user = await prisma.user.create({ data: { email, passwordHash, nickname } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = (err.meta?.target as string[] | undefined)?.[0];
        const message =
          target === "nickname" ? "이미 사용 중인 닉네임입니다." : "이미 가입된 이메일입니다.";
        return NextResponse.json({ error: message }, { status: 409 });
      }
      throw err;
    }

    const response = NextResponse.json(
      { id: user.id, email: user.email, nickname: user.nickname },
      { status: 201 }
    );
    response.cookies.set(SESSION_COOKIE, signSession(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (err) {
    return handleRouteError(err);
  }
}
