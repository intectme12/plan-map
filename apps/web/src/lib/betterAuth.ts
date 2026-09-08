import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import type { GoogleProfile, KakaoProfile, NaverProfile } from "better-auth/social-providers";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { isNicknameAvailable } from "./services/users";

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
if (!BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET 환경변수가 설정되어 있지 않습니다.");
}

// OAuth 프로필의 이름은 다른 회원과 겹칠 수 있는데 nickname은 @unique라, 겹치면 임의의
// 4자리 숫자를 붙여서 재시도한다(그래도 겹치면 타임스탬프로 폴백).
async function generateUniqueNickname(base: string): Promise<string> {
  const trimmed = base.trim().slice(0, 40) || "사용자";
  if (await isNicknameAvailable(trimmed)) return trimmed;
  for (let i = 0; i < 5; i++) {
    const candidate = `${trimmed}${Math.floor(1000 + Math.random() * 9000)}`;
    if (await isNicknameAvailable(candidate)) return candidate;
  }
  return `${trimmed}${Date.now()}`;
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const kakaoClientId = process.env.KAKAO_CLIENT_ID;
const kakaoClientSecret = process.env.KAKAO_CLIENT_SECRET;
const naverClientId = process.env.NAVER_CLIENT_ID;
const naverClientSecret = process.env.NAVER_CLIENT_SECRET;

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // nickname/avatarUrl 컬럼을 그대로 재사용 — 새 컬럼을 만들지 않는다.
  user: {
    fields: { name: "nickname", image: "avatarUrl" },
  },
  // 기존 회원의 bcrypt 해시(users.passwordHash → account.password로 1회 이관)와
  // 계속 호환되도록 해싱/검증 함수를 자체 bcrypt 구현으로 교체한다.
  emailAndPassword: {
    enabled: true,
    password: {
      hash: hashPassword,
      verify: ({ password, hash }) => verifyPassword(password, hash),
    },
  },
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            mapProfileToUser: async (profile: GoogleProfile) => ({
              name: await generateUniqueNickname(profile.name),
            }),
          },
        }
      : {}),
    // 카카오 로그인은 사업자 인증 없이는 이메일 동의항목을 못 받아 email이 없을 수 있다 —
    // 그 경우 고유 플레이스홀더 이메일로 대체(실 이메일 아님을 알 수 있는 형식).
    ...(kakaoClientId
      ? {
          kakao: {
            clientId: kakaoClientId,
            clientSecret: kakaoClientSecret,
            mapProfileToUser: async (profile: KakaoProfile) => {
              const account = profile.kakao_account;
              const base = account?.profile?.nickname || account?.name || `카카오사용자${profile.id}`;
              return {
                name: await generateUniqueNickname(base),
                email: account?.email ?? `kakao_${profile.id}@oauth.local`,
              };
            },
          },
        }
      : {}),
    ...(naverClientId && naverClientSecret
      ? {
          naver: {
            clientId: naverClientId,
            clientSecret: naverClientSecret,
            mapProfileToUser: async (profile: NaverProfile) => {
              const r = profile.response;
              return {
                name: await generateUniqueNickname(r.nickname || r.name || `네이버사용자${r.id}`),
                email: r.email || `naver_${r.id}@oauth.local`,
              };
            },
          },
        }
      : {}),
  },
  // Route Handler에서 auth.api.*를 직접 호출해도 Set-Cookie를 자동으로 반영해준다.
  plugins: [nextCookies()],
});
