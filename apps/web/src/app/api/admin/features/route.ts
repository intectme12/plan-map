import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { isFeatureKey, listFeatureStates, setFeatureDisabled } from "@/lib/featureFlags";
import { unauthorized, notFound, handleRouteError, readJsonBody } from "@/lib/http";

// 긴급 차단 스위치 조회/변경 — 관리자 전용(다른 관리자 API와 같이 관리자가 아니면 404로 존재를 숨김)
const updateSchema = z.object({
  key: z.string().refine(isFeatureKey, "알 수 없는 기능입니다."),
  disabled: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user)) return notFound();
    return NextResponse.json(await listFeatureStates());
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (!isAdmin(user)) return notFound();

    const { key, disabled, reason } = updateSchema.parse(await readJsonBody(request));
    if (!isFeatureKey(key)) return notFound();
    await setFeatureDisabled(key, disabled, user.id, reason);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
