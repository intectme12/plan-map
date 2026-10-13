import { prisma } from "../db";
import { ForbiddenError, NotFoundError } from "../errors";
import { assertPlaceEditAccess } from "./tripAccess";
import { saveImageFile, deleteStoredFile } from "../upload";
import { withUploadQuota } from "./uploadQuota";

// 장소 하나에 사진 최대 장수 — docs/SECURITY_PLAN.md 4단계
export const MAX_PHOTOS_PER_PLACE = 30;

export async function addPhoto(userId: string, tripId: string, placeId: string, file: File) {
  await assertPlaceEditAccess(userId, tripId, placeId);

  const count = await prisma.photo.count({ where: { placeEntryId: placeId } });
  if (count >= MAX_PHOTOS_PER_PLACE) {
    throw new ForbiddenError(`장소 하나에 사진은 최대 ${MAX_PHOTOS_PER_PLACE}장까지 올릴 수 있습니다.`);
  }

  return withUploadQuota(userId, file.size, async () => {
    const storageKey = await saveImageFile(file, [tripId, placeId]);
    return prisma.photo.create({ data: { placeEntryId: placeId, storageKey } });
  });
}

export async function deletePhoto(userId: string, tripId: string, placeId: string, photoId: string) {
  await assertPlaceEditAccess(userId, tripId, placeId);

  const photo = await prisma.photo.findFirst({ where: { id: photoId, placeEntryId: placeId } });
  if (!photo) throw new NotFoundError("사진을 찾을 수 없습니다.");

  await prisma.photo.delete({ where: { id: photoId } });
  await deleteStoredFile(photo.storageKey);
}
