import { test } from "node:test";
import assert from "node:assert/strict";
import { detectImageExt, readImageFile, MAX_FILE_SIZE } from "./upload";
import { readFormData } from "./http";
import { InvalidFileError, PayloadTooLargeError } from "./errors";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPG = bytes(0xff, 0xd8, 0xff, 0xe0);
const GIF = new TextEncoder().encode("GIF89a........");
const WEBP = new TextEncoder().encode("RIFF\x00\x00\x00\x00WEBPVP8 ");

test("파일 앞부분으로 실제 이미지 형식을 판단한다", () => {
  assert.equal(detectImageExt(PNG), "png");
  assert.equal(detectImageExt(JPG), "jpg");
  assert.equal(detectImageExt(GIF), "gif");
  assert.equal(detectImageExt(WEBP), "webp");
  assert.equal(detectImageExt(new TextEncoder().encode("<html><script>alert(1)</script>")), null);
  assert.equal(detectImageExt(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(detectImageExt(new TextEncoder().encode("RIFF\x00\x00\x00\x00WAVEfmt ")), null);
  assert.equal(detectImageExt(new Uint8Array([])), null);
});

test("확장자·file.type을 이미지로 속인 파일은 거절하고, 실제 형식으로 확장자를 정한다", async () => {
  const fake = new File(["<html>hi</html>"], "x.png", { type: "image/png" });
  await assert.rejects(readImageFile(fake), InvalidFileError);

  const realPngLabeledJpeg = new File([PNG], "x.jpg", { type: "image/jpeg" });
  assert.equal((await readImageFile(realPngLabeledJpeg)).ext, "png");
});

test("8MB를 넘는 파일은 내용을 읽기 전에 거절한다", async () => {
  const big = new File([new Uint8Array(MAX_FILE_SIZE + 1)], "big.png", { type: "image/png" });
  await assert.rejects(readImageFile(big), /8MB/);
});

test("업로드 요청이 선언한 크기가 상한을 넘으면 본문을 읽기 전에 413", async () => {
  const req = new Request("http://x/", {
    method: "POST",
    body: "x",
    headers: { "content-length": String(50 * 1024 * 1024) },
  });
  await assert.rejects(readFormData(req), PayloadTooLargeError);
});
