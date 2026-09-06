import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  NotFoundError,
  ServiceUnavailableError,
  InvalidFileError,
  InvalidCredentialsError,
  NicknameTakenError,
} from "./errors";

export function unauthorized() {
  return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
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
  if (err instanceof ServiceUnavailableError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  if (err instanceof InvalidFileError) {
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
