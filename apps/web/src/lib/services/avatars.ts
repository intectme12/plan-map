import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "../db";
import { readImageFile } from "../upload";
import { withUploadQuota } from "./uploadQuota";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "avatars");

async function deleteExistingFile(avatarUrl: string | null) {
  if (!avatarUrl) return;
  await unlink(path.join(process.cwd(), "public", avatarUrl)).catch(() => {});
}

export async function setAvatar(userId: string, file: File) {
  // 크기·실제 형식 검사(매직 바이트)는 lib/upload.ts와 같은 기준, 업로드 횟수·일일 용량 한도도 동일하게 적용
  const { buffer, ext } = await readImageFile(file);
  const filename = `${randomUUID()}.${ext}`;
  await withUploadQuota(userId, file.size, async () => {
    const dir = path.join(UPLOAD_ROOT, userId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
  });

  const prev = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avatarUrl: true } });
  await deleteExistingFile(prev.avatarUrl);

  const avatarUrl = `/uploads/avatars/${userId}/${filename}`;
  return prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
}

export async function removeAvatar(userId: string) {
  const prev = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avatarUrl: true } });
  await deleteExistingFile(prev.avatarUrl);
  return prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
}
