import { prisma } from "../../db";

export function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nickname: true,
      role: true,
      createdAt: true,
      _count: { select: { trips: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateUserRole(userId: string, role: "USER" | "ADMIN") {
  const result = await prisma.user.updateMany({ where: { id: userId }, data: { role } });
  return result.count > 0;
}

export async function deleteUser(userId: string) {
  const result = await prisma.user.deleteMany({ where: { id: userId } });
  return result.count > 0;
}
