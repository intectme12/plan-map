import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateBio } from "@/lib/services/users";
import { updateBioSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const { bio } = updateBioSchema.parse(body);
    const updated = await updateBio(user.id, bio);
    return NextResponse.json({ bio: updated.bio });
  } catch (err) {
    return handleRouteError(err);
  }
}
