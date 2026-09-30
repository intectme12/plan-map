import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/services/users";
import { listSharedTrips } from "@/lib/services/trips";
import { getFollowState } from "@/lib/services/follows";
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

    const isOwnProfile = profile.id === user.id;
    const canSeeTrips = isOwnProfile || profile.showTripsOnProfile;
    // 프로필 팝업(UserProfileModal)이 /users/[nickname] 페이지와 같은 정보(팔로우 버튼·팔로워/팔로잉 수)를 보여주도록 함께 내려준다
    const [trips, followState] = await Promise.all([
      canSeeTrips ? listSharedTrips(undefined, 0, profile.id, user.id) : Promise.resolve([]),
      getFollowState(user.id, profile.id),
    ]);

    return NextResponse.json({ profile, trips, canSeeTrips, isOwnProfile, followState });
  } catch (err) {
    return handleRouteError(err);
  }
}
