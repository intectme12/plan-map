import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchUsers } from "@/lib/services/users";
import { userSearchQuerySchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const { q, cursor } = userSearchQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });
    const users = await searchUsers(q, cursor);
    return NextResponse.json(users);
  } catch (err) {
    return handleRouteError(err);
  }
}
