import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "../db";
import { NotFoundError, InvalidFileError } from "../errors";

// 로컬 디스크 저장 (S3/R2는 운영 단계에서 도입). public/uploads 아래에 저장해 정적 파일로 바로 서빙한다.
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const EXT_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function assertPlaceOwnership(userId: string, tripId: string, placeId: string) {
  const place = await prisma.placeEntry.findFirst({
    where: { id: placeId, tripId, trip: { userId } },
    select: { id: true },
  });
  if (!place) throw new NotFoundError("장소를 찾을 수 없습니다.");
}

export async function addPhoto(userId: string, tripId: string, placeId: string, file: File) {
  await assertPlaceOwnership(userId, tripId, placeId);

  const ext = EXT_BY_MIME_TYPE[file.type];
  if (!ext) {
    throw new InvalidFileError("이미지 파일(jpg/png/webp/gif)만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new InvalidFileError("파일 크기는 8MB 이하여야 합니다.");
  }

  const dir = path.join(UPLOAD_ROOT, tripId, placeId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const storageKey = `/uploads/${tripId}/${placeId}/${filename}`;
  return prisma.photo.create({ data: { placeEntryId: placeId, storageKey } });
}

export async function deletePhoto(userId: string, tripId: string, placeId: string, photoId: string) {
  await assertPlaceOwnership(userId, tripId, placeId);

  const photo = await prisma.photo.findFirst({ where: { id: photoId, placeEntryId: placeId } });
  if (!photo) throw new NotFoundError("사진을 찾을 수 없습니다.");

  await prisma.photo.delete({ where: { id: photoId } });
  await unlink(path.join(process.cwd(), "public", photo.storageKey)).catch(() => {});
}
