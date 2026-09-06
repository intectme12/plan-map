import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isNicknameAvailable } from "@/lib/services/users";
import { nicknameCheckSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const { nickname } = nicknameCheckSchema.parse({
      nickname: searchParams.get("nickname"),
    });
    const available = await isNicknameAvailable(nickname, user.id);
    return NextResponse.json({ available });
  } catch (err) {
    return handleRouteError(err);
  }
}
