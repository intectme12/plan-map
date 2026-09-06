import { NextResponse } from "next/server";
import { isNicknameAvailable } from "@/lib/services/users";
import { nicknameCheckSchema } from "@/lib/validation";
import { handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { nickname } = nicknameCheckSchema.parse({
      nickname: searchParams.get("nickname"),
    });
    const available = await isNicknameAvailable(nickname);
    return NextResponse.json({ available });
  } catch (err) {
    return handleRouteError(err);
  }
}
