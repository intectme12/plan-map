import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./betterAuth";
import { prisma } from "./db";

// 세션/이메일가입/OAuth(카카오·구글·네이버)는 better-auth(lib/betterAuth.ts)가 관장한다 —
// docs/OAUTH.md 참고. getCurrentUser()는 예전과 동일하게 raw User row를 반환해서(반환 타입
// 그대로 유지), 이 함수를 쓰는 다른 코드는 전부 안 건드려도 된다.
// React cache()로 감싸 한 요청(렌더) 안에서 여러 번 불려도 세션·유저 조회는 한 번만 한다.
// User row는 닉네임·자기소개 등 방금 바뀐 값을 바로 반영해야 해서 세션 캐시에 의존하지 않고 매번 조회.
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  return prisma.user.findUnique({ where: { id: session.user.id } });
});

export function isAdmin(user: { role: string } | null | undefined) {
  return user?.role === "ADMIN";
}
