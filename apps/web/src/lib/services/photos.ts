import { prisma } from "../db";
import { NotFoundError } from "../errors";
import { assertPlaceEditAccess } from "./tripAccess";
import { saveImageFile, deleteStoredFile } from "../upload";

export async function addPhoto(userId: string, tripId: string, placeId: string, file: File) {
  await assertPlaceEditAccess(userId, tripId, placeId);

  const storageKey = await saveImageFile(file, [tripId, placeId]);
  return prisma.photo.create({ data: { placeEntryId: placeId, storageKey } });
}

export async function deletePhoto(userId: string, tripId: string, placeId: string, photoId: string) {
  await assertPlaceEditAccess(userId, tripId, placeId);

  const photo = await prisma.photo.findFirst({ where: { id: photoId, placeEntryId: placeId } });
  if (!photo) throw new NotFoundError("사진을 찾을 수 없습니다.");

  await prisma.photo.delete({ where: { id: photoId } });
  await deleteStoredFile(photo.storageKey);
}
