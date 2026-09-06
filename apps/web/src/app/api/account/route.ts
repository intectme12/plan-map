import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateNickname } from "@/lib/services/users";
import { updateProfileSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const { nickname } = updateProfileSchema.parse(body);
    const updated = await updateNickname(user.id, nickname);
    return NextResponse.json({ id: updated.id, email: updated.email, nickname: updated.nickname });
  } catch (err) {
    return handleRouteError(err);
  }
}
