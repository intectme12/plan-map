import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateProfileFields } from "@/lib/services/users";
import { updateProfileFieldsSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const data = updateProfileFieldsSchema.parse(body);
    const updated = await updateProfileFields(user.id, data);
    return NextResponse.json({ bio: updated.bio, showTripsOnProfile: updated.showTripsOnProfile });
  } catch (err) {
    return handleRouteError(err);
  }
}
