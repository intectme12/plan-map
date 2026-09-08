import { headers } from "next/headers";
import { auth } from "./betterAuth";
import { prisma } from "./db";

// 세션/이메일가입/OAuth(카카오·구글·네이버)는 better-auth(lib/betterAuth.ts)가 관장한다 —
// docs/OAUTH.md 참고. getCurrentUser()는 예전과 동일하게 raw User row를 반환해서(반환 타입
// 그대로 유지), 이 함수를 쓰는 다른 코드는 전부 안 건드려도 된다.
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export function isAdmin(user: { role: string } | null | undefined) {
  return user?.role === "ADMIN";
}
