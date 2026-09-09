import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listFollowers } from "@/lib/services/follows";
import { followListQuerySchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nickname: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { nickname: rawNickname } = await params;
    const nickname = decodeURIComponent(rawNickname);
    const { searchParams } = new URL(request.url);
    const { cursor } = followListQuerySchema.parse({
      cursor: searchParams.get("cursor") ?? undefined,
    });

    const followers = await listFollowers(nickname, cursor);
    return NextResponse.json(followers);
  } catch (err) {
    return handleRouteError(err);
  }
}
