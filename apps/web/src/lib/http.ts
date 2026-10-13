import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  NotFoundError,
  ForbiddenError,
  ServiceUnavailableError,
  RateLimitedError,
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
