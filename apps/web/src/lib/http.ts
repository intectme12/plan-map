import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  NotFoundError,
  ForbiddenError,
  ServiceUnavailableError,
  RateLimitedError,
  PayloadTooLargeError,
  InvalidFileError,
  InvalidCredentialsError,
  NicknameTakenError,
  InvalidInputError,
} from "./errors";

export function unauthorized() {
  return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
}

// 요청 제한 초과 — Retry-After(초)를 함께 보내 클라이언트가 언제 다시 시도할지 알 수 있게 한다
export function tooManyRequests(
  retryAfterSec: number,
  message = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
) {
  return NextResponse.json(
    { error: message, retryAfterSec },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

// 요청 본문을 크기 상한을 두고 JSON으로 읽는다(너무 큰 본문으로 서버 메모리·DB 쓰기를 부풀리는 요청 차단).
// 앞단(nginx client_max_body_size)에서도 막지만 앱에서 한 번 더. 상한 초과면 PayloadTooLargeError(413),
// JSON이 아니면 null(→ 이어지는 zod 검증이 400).
export async function readJsonBody(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new PayloadTooLargeError();
  const text = await request.text().catch(() => "");
  if (Buffer.byteLength(text) > maxBytes) throw new PayloadTooLargeError();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// 업로드(multipart) 본문 — formData()는 본문 전체를 메모리에 올리므로, 선언된 크기(Content-Length)가
// 상한(파일 8MB + 여유)을 넘으면 읽기 전에 거절한다. 크기를 안 밝힌(chunked) 요청은 앞단 nginx가 막는다.
export async function readFormData(request: Request, maxBytes = 9 * 1024 * 1024): Promise<FormData | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new PayloadTooLargeError("파일 크기는 8MB 이하여야 합니다.");
  }
  return request.formData().catch(() => null);
}

export function notFound(message = "찾을 수 없습니다.") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.flatten() }, { status: 400 });
  }
  if (err instanceof NotFoundError) {
    return notFound(err.message);
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof PayloadTooLargeError) {
    return NextResponse.json({ error: err.message }, { status: 413 });
  }
  if (err instanceof RateLimitedError) {
    return tooManyRequests(err.retryAfterSec, err.message);
  }
  if (err instanceof ServiceUnavailableError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  if (err instanceof InvalidFileError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof InvalidInputError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof InvalidCredentialsError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof NicknameTakenError) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
  console.error(err);
  return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
}
