import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "../db";
import { InvalidFileError } from "../errors";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "avatars");
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const EXT_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function deleteExistingFile(avatarUrl: string | null) {
  if (!avatarUrl) return;
  await unlink(path.join(process.cwd(), "public", avatarUrl)).catch(() => {});
}

export async function setAvatar(userId: string, file: File) {
  const ext = EXT_BY_MIME_TYPE[file.type];
  if (!ext) {
    throw new InvalidFileError("이미지 파일(jpg/png/webp/gif)만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new InvalidFileError("파일 크기는 8MB 이하여야 합니다.");
  }

  const dir = path.join(UPLOAD_ROOT, userId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

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
