import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { InvalidFileError } from "./errors";

// 로컬 디스크 저장(public/uploads 아래) — photos.ts/conversations.ts/trips.ts(대표사진)/avatars.ts가 공유하는 검증/저장 로직.
export const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
export const MAX_FILE_SIZE = 8 * 1024 * 1024;

// 파일 앞부분(매직 바이트)으로 실제 형식을 판단한다 — 브라우저가 보내는 file.type은 클라이언트가 마음대로
// 바꿀 수 있어서(예: HTML/SVG를 image/png라고 올리기) 믿지 않는다. docs/SECURITY_PLAN.md 4단계.
export function detectImageExt(bytes: Uint8Array): "jpg" | "png" | "gif" | "webp" | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith([0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
    return "gif"; // GIF87a / GIF89a
  }
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "webp"; // RIFF....WEBP
  return null;
}

// 크기·실제 형식을 확인하고 내용과 확장자를 돌려준다(저장 위치는 호출 측이 정함)
export async function readImageFile(file: File): Promise<{ buffer: Buffer; ext: string }> {
  if (file.size > MAX_FILE_SIZE) {
    throw new InvalidFileError("파일 크기는 8MB 이하여야 합니다.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = detectImageExt(buffer);
  if (!ext) {
    throw new InvalidFileError("이미지 파일(jpg/png/webp/gif)만 업로드할 수 있습니다.");
  }
  return { buffer, ext };
}

// dirParts: UPLOAD_ROOT 아래 저장 경로(예: [tripId, placeId] 또는 ["messages", conversationId]).
// 반환값은 항상 "/uploads/..."로 시작하는 storageKey(=DB에 저장, <img src>로 바로 서빙 가능).
export async function saveImageFile(file: File, dirParts: string[]): Promise<string> {
  const { buffer, ext } = await readImageFile(file);

  const dir = path.join(UPLOAD_ROOT, ...dirParts);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${dirParts.join("/")}/${filename}`;
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  await unlink(path.join(process.cwd(), "public", storageKey)).catch(() => {});
}
