export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
export class ServiceUnavailableError extends Error {}
export class InvalidFileError extends Error {}
export class InvalidCredentialsError extends Error {}
export class NicknameTakenError extends Error {}
// zod 스키마만으로는 판단할 수 없는(DB 값과 합쳐 봐야 하는) 입력 오류 — 400으로 응답
export class InvalidInputError extends Error {}
