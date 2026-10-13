import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { APIError } from "better-auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/betterAuth";
import { registerSchema } from "@/lib/validation";
import { handleRouteError, readJsonBody, tooManyRequests } from "@/lib/http";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/clientIp";
import { enforceRateLimits, GLOBAL_SUBJECT, RATE_RULES } from "@/lib/rateLimit";
import { assertFeatureEnabled } from "@/lib/featureFlags";

export async function POST(request: Request) {
  try {
    // 입력 검증보다 먼저 센다 — 잘못된 요청을 반복해 보내는 것도 시도 횟수로 친다
    const ip = getClientIp(request.headers);
    const limited = await enforceRateLimits([
      { rule: RATE_RULES.registerPerIp10m, subject: ip },
      { rule: RATE_RULES.registerPerIpDay, subject: ip },
      { rule: RATE_RULES.registerGlobalHour, subject: GLOBAL_SUBJECT },
    ]);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);
    await assertFeatureEnabled("signup");

    const body = await readJsonBody(request);
    const { email, password, nickname } = registerSchema.parse(body);

    // 봇 확인(Cloudflare Turnstile) — 입력 형식 검증 뒤, DB 조회·계정 생성 전에
    const turnstileToken = (body as { turnstileToken?: unknown } | null)?.turnstileToken;
    const human = await verifyTurnstile(turnstileToken, ip);
    if (!human.ok) {
      return NextResponse.json(
        {
          error:
            human.reason === "missing_token"
              ? "봇 확인을 완료한 뒤 다시 시도해주세요."
              : "봇 확인에 실패했습니다. 새로고침 후 다시 시도해주세요.",
          code: "TURNSTILE_FAILED",
        },
        { status: 400 }
      );
    }

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
