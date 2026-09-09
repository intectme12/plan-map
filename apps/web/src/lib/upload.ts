import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { InvalidFileError } from "./errors";

// 로컬 디스크 저장(public/uploads 아래) — photos.ts/conversations.ts가 공유하는 검증/저장 로직.
export const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const EXT_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// dirParts: UPLOAD_ROOT 아래 저장 경로(예: [tripId, placeId] 또는 ["messages", conversationId]).
// 반환값은 항상 "/uploads/..."로 시작하는 storageKey(=DB에 저장, <img src>로 바로 서빙 가능).
export async function saveImageFile(file: File, dirParts: string[]): Promise<string> {
  const ext = EXT_BY_MIME_TYPE[file.type];
  if (!ext) {
    throw new InvalidFileError("이미지 파일(jpg/png/webp/gif)만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new InvalidFileError("파일 크기는 8MB 이하여야 합니다.");
  }

  const dir = path.join(UPLOAD_ROOT, ...dirParts);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${dirParts.join("/")}/${filename}`;
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  await unlink(path.join(process.cwd(), "public", storageKey)).catch(() => {});
}
