import bcrypt from "bcryptjs";

// better-auth의 emailAndPassword.password 훅에 그대로 연결해서, better-auth 도입 이전
// 계정들의 bcrypt 해시와 계속 호환되게 한다(재설정 불필요) — lib/betterAuth.ts 참고.
export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
