import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProfile } from "@/lib/services/users";
import { listSharedTrips, getProfileHighlights } from "@/lib/services/trips";
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
    // 프로필 팝업(UserProfileModal)이 /users/[nickname] 페이지와 같은 정보(팔로우 버튼·팔로워/팔로잉 수)를 보여주도록 함께 내려준다.
    // highlights(사진 갤러리·취향 태그·커버·나에게 공유한 여행)는 팝업 전용 부가 정보.
    const [trips, followState, highlights] = await Promise.all([
      canSeeTrips ? listSharedTrips(undefined, 0, profile.id, user.id) : Promise.resolve([]),
      getFollowState(user.id, profile.id),
      getProfileHighlights(profile.id, user.id, canSeeTrips),
    ]);

    // showTripsOnProfile은 서버 권한 판단용이라 응답에서 뺀다
    const { showTripsOnProfile: _omit, ...publicProfile } = profile;
    void _omit;

    return NextResponse.json({ profile: publicProfile, trips, canSeeTrips, isOwnProfile, followState, highlights });
  } catch (err) {
    return handleRouteError(err);
  }
}
