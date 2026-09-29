import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTripShareContext } from "@/lib/services/trips";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string }> };

// 공유 팝업용: 소유자 정보 + 미가입 동행자 이름 목록(소유자만 조회 가능 — 서비스에서 확인)
export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId } = await params;
    return NextResponse.json(await getTripShareContext(user.id, tripId));
  } catch (err) {
    return handleRouteError(err);
  }
}
