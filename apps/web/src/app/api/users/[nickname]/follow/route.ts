import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { followUser, unfollowUser } from "@/lib/services/follows";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ nickname: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { nickname: rawNickname } = await params;
    const nickname = decodeURIComponent(rawNickname);
    await followUser(user.id, nickname);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { nickname: rawNickname } = await params;
    const nickname = decodeURIComponent(rawNickname);
    await unfollowUser(user.id, nickname);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
