import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/betterAuth";

// better-auth가 내부적으로 쓰는 세션/OAuth 콜백 엔드포인트
// (예: /api/auth/callback/kakao, /api/auth/sign-in/social)를 여기서 전부 처리한다.
// 기존 /api/auth/{login,register,logout,me} 라우트는 그대로 두고 내부 구현만
// auth.api.*를 호출하도록 바꿨다 — URL/응답 계약은 안 건드림.
export const { GET, POST } = toNextJsHandler(auth);
