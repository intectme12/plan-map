import { prisma } from "../db";
import { NotFoundError, ForbiddenError } from "../errors";
import { createFollowNotification } from "./notifications";

const FOLLOW_PAGE_SIZE = 20;

const followUserSelect = {
  id: true,
  nickname: true,
  bio: true,
  avatarUrl: true,
} as const;

async function findUserByNickname(nickname: string) {
  const user = await prisma.user.findUnique({ where: { nickname } });
  if (!user) throw new NotFoundError("존재하지 않는 회원입니다.");
  return user;
}

export async function followUser(followerId: string, targetNickname: string) {
  const target = await findUserByNickname(targetNickname);
  if (target.id === followerId) throw new ForbiddenError("자기 자신은 팔로우할 수 없습니다.");

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId: target.id } },
    create: { followerId, followingId: target.id },
    update: {},
  });

  await createFollowNotification(followerId, target.id);
}

export async function unfollowUser(followerId: string, targetNickname: string) {
  const target = await findUserByNickname(targetNickname);
  await prisma.follow.deleteMany({ where: { followerId, followingId: target.id } });
}

// 프로필 헤더에 한번에 필요한 팔로우 상태 — 카운트 2개 + 내가 팔로우 중인지 여부를 한 번에 조회
export async function getFollowState(viewerUserId: string, targetUserId: string) {
  const [followerCount, followingCount, viewerFollow] = await Promise.all([
    prisma.follow.count({ where: { followingId: targetUserId } }),
    prisma.follow.count({ where: { followerId: targetUserId } }),
    viewerUserId === targetUserId
      ? null
      : prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerUserId, followingId: targetUserId } },
        }),
  ]);

  return { followerCount, followingCount, isFollowing: viewerFollow !== null };
}

export async function listFollowers(nickname: string, cursor: number) {
  const target = await findUserByNickname(nickname);
  const rows = await prisma.follow.findMany({
    where: { followingId: target.id },
    orderBy: { createdAt: "desc" },
    skip: cursor,
    take: FOLLOW_PAGE_SIZE,
    include: { follower: { select: followUserSelect } },
  });
  return rows.map((r) => r.follower);
}

export async function listFollowing(nickname: string, cursor: number) {
  const target = await findUserByNickname(nickname);
  const rows = await prisma.follow.findMany({
    where: { followerId: target.id },
    orderBy: { createdAt: "desc" },
    skip: cursor,
    take: FOLLOW_PAGE_SIZE,
    include: { following: { select: followUserSelect } },
  });
  return rows.map((r) => r.following);
}
