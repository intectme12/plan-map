import { prisma } from "../../db";

export function listNotices() {
  return prisma.notice.findMany({ orderBy: { createdAt: "desc" } });
}

export function getNotice(noticeId: string) {
  return prisma.notice.findUnique({ where: { id: noticeId } });
}

export function createNotice(authorId: string, data: { title: string; content: string }) {
  return prisma.notice.create({ data: { ...data, authorId } });
}

export async function updateNotice(
  noticeId: string,
  data: Partial<{ title: string; content: string }>
) {
  const result = await prisma.notice.updateMany({ where: { id: noticeId }, data });
  return result.count > 0;
}

export async function deleteNotice(noticeId: string) {
  const result = await prisma.notice.deleteMany({ where: { id: noticeId } });
  return result.count > 0;
}
