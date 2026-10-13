export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
export class ServiceUnavailableError extends Error {}
// 요청 제한/사용량 예산 초과 — handleRouteError가 429 + Retry-After로 응답
export class RateLimitedError extends Error {
  constructor(
    message = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    readonly retryAfterSec = 60
  ) {
    super(message);
  }
}
export class PayloadTooLargeError extends Error {
  constructor(message = "요청 데이터가 너무 큽니다.") {
    super(message);
  }
}
export class InvalidFileError extends Error {}
export class InvalidCredentialsError extends Error {}
export class NicknameTakenError extends Error {}
// zod 스키마만으로는 판단할 수 없는(DB 값과 합쳐 봐야 하는) 입력 오류 — 400으로 응답
export class InvalidInputError extends Error {}
