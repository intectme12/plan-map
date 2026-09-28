import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { NicknameTakenError } from "../errors";

export async function isNicknameAvailable(nickname: string, excludeUserId?: string) {
  const existing = await prisma.user.findUnique({ where: { nickname } });
  if (!existing) return true;
  return existing.id === excludeUserId;
}

export async function updateNickname(userId: string, nickname: string) {
  const available = await isNicknameAvailable(nickname, userId);
  if (!available) throw new NicknameTakenError("이미 사용 중인 닉네임입니다.");

  try {
    return await prisma.user.update({ where: { id: userId }, data: { nickname } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new NicknameTakenError("이미 사용 중인 닉네임입니다.");
    }
    throw err;
  }
}

export function updateProfileFields(
  userId: string,
  data: Partial<{ bio: string; showTripsOnProfile: boolean }>
) {
  return prisma.user.update({ where: { id: userId }, data });
}

const SEARCH_PAGE_SIZE = 20;

// 검색어 없이 회원검색 탭에 들어온 경우(=q 미입력): "다른 사람에게 내 여행 목록 보이기"를
// 켜둔 회원을 자동으로 보여준다(둘러볼 대상이니 본인은 제외). 검색어를 입력하면 기존처럼
// 닉네임 부분일치 검색으로 전환된다.
export function searchUsers(q: string | undefined, cursor: number, excludeUserId?: string) {
  const term = q?.trim();
  const baseWhere: Prisma.UserWhereInput = term
    ? { nickname: { contains: term, mode: "insensitive" } }
    : { showTripsOnProfile: true };
  const where: Prisma.UserWhereInput =
    !term && excludeUserId ? { AND: [baseWhere, { id: { not: excludeUserId } }] } : baseWhere;

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      nickname: true,
      bio: true,
      avatarUrl: true,
      _count: { select: { trips: { where: { visibility: "PUBLIC" } } } },
    },
    orderBy: { nickname: "asc" },
    skip: cursor,
    take: SEARCH_PAGE_SIZE,
  });
}

export function getPublicProfile(nickname: string) {
  return prisma.user.findUnique({
    where: { nickname },
    select: {
      id: true,
      nickname: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
      showTripsOnProfile: true,
      _count: { select: { trips: { where: { visibility: "PUBLIC" } } } },
    },
  });
}
