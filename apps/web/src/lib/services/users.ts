import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { hashPassword, verifyPassword } from "../auth";
import { InvalidCredentialsError, NicknameTakenError } from "../errors";

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

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new InvalidCredentialsError("현재 비밀번호가 올바르지 않습니다.");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export function updateBio(userId: string, bio: string) {
  return prisma.user.update({ where: { id: userId }, data: { bio } });
}

const SEARCH_PAGE_SIZE = 20;

export function searchUsers(q: string | undefined, cursor: number) {
  const term = q?.trim();
  if (!term) return Promise.resolve([]);

  return prisma.user.findMany({
    where: { nickname: { contains: term, mode: "insensitive" } },
    select: {
      id: true,
      nickname: true,
      bio: true,
      avatarUrl: true,
      _count: { select: { trips: { where: { isPublic: true } } } },
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
      _count: { select: { trips: { where: { isPublic: true } } } },
    },
  });
}
