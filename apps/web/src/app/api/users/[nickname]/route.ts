import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/services/users";
import { listSharedTrips } from "@/lib/services/trips";
import { unauthorized, notFound, handleRouteError } from "@/lib/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nickname: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { nickname: rawNickname } = await params;
    // /users/[nickname] 페이지와 동일: Next.js가 동적 세그먼트의 비-ASCII 값을
    // percent-encoding된 상태 그대로 넘겨줘서 직접 디코딩해야 한다.
    const nickname = decodeURIComponent(rawNickname);
    const profile = await getPublicProfile(nickname);
    if (!profile) return notFound();

    const canSeeTrips = profile.id === user.id || profile.showTripsOnProfile;
    const trips = canSeeTrips ? await listSharedTrips(undefined, 0, profile.id, user.id) : [];

    return NextResponse.json({ profile, trips, canSeeTrips });
  } catch (err) {
    return handleRouteError(err);
  }
}
