import { NextResponse } from "next/server";
import { APIError } from "better-auth";
import { headers } from "next/headers";
import { auth } from "@/lib/betterAuth";
import { loginSchema } from "@/lib/validation";
import { handleRouteError, tooManyRequests } from "@/lib/http";
import { getClientIp } from "@/lib/clientIp";
import { enforceRateLimits, hashSubject, RATE_RULES } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { email, password } = loginSchema.parse(body);

    // IP 기준(여러 계정에 대입) + 이메일 기준(한 계정에 여러 IP로 대입) 둘 다 센다. 이메일은 해시로만 저장.
    const limited = await enforceRateLimits([
      { rule: RATE_RULES.loginPerIp10m, subject: getClientIp(request.headers) },
      { rule: RATE_RULES.loginPerEmail10m, subject: hashSubject(email) },
    ]);
    if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

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
