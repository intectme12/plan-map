import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import type { GoogleProfile, KakaoProfile, NaverProfile } from "better-auth/social-providers";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { isNicknameAvailable } from "./services/users";
import { NICKNAME_MAX_LENGTH } from "./validation";

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
if (!BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET 환경변수가 설정되어 있지 않습니다.");
}

// OAuth 프로필의 이름은 다른 회원과 겹칠 수 있는데 nickname은 @unique라, 겹치면 임의의
// 4자리 숫자를 붙여서 재시도한다(그래도 겹치면 6자리로 폴백). 닉네임 최대 길이(NICKNAME_MAX_LENGTH)를
// 넘지 않도록 숫자를 붙일 자리만큼 이름을 먼저 자른다.
async function generateUniqueNickname(base: string): Promise<string> {
  const name = [...(base.trim() || "사용자")];
  const trimmed = name.slice(0, NICKNAME_MAX_LENGTH).join("");
  if (await isNicknameAvailable(trimmed)) return trimmed;
  const head4 = name.slice(0, NICKNAME_MAX_LENGTH - 4).join("");
  for (let i = 0; i < 5; i++) {
    const candidate = `${head4}${Math.floor(1000 + Math.random() * 9000)}`;
    if (await isNicknameAvailable(candidate)) return candidate;
  }
  return `${name.slice(0, NICKNAME_MAX_LENGTH - 6).join("")}${String(Date.now()).slice(-6)}`;
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
  // 세션을 서명된 쿠키에 5분간 캐시해 매 요청마다 하던 세션 DB 조회를 건너뛴다(DB가 원격일 때
  // 요청당 왕복 1회 절약 — docs/DEPLOYMENT_PLAN.md 측정 참고). 로그아웃(signOut)은 캐시 쿠키도
  // 함께 지운다. 트레이드오프: 다른 기기에서 세션을 폐기해도 이 기기에선 최대 5분간 유효할 수 있음.
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  account: {
    accountLinking: {
      trustedProviders: ["google", "kakao", "naver"],
      // 이 앱은 이메일 인증 절차 자체가 없어서(회원가입 시 이메일 소유 확인 안 함) 모든
      // 계정이 항상 emailVerified=false다. 기본값(true)대로 두면 이메일/비밀번호로 먼저
      // 가입한 회원은 같은 이메일의 OAuth로 영영 연결(로그인)할 수 없어서 false로 낮춘다.
      // 트레이드오프: 공격자가 남의 이메일로 먼저 비밀번호 계정을 만들어두면, 그 사람이
      // 나중에 진짜 소유한 구글/카카오/네이버로 로그인할 때 공격자가 만든 계정에 연결될
      // 수 있음 — 이메일 인증 절차를 도입하기 전까지 감수하는 위험.
      requireLocalEmailVerified: false,
    },
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
    // 카카오 로그인은 사업자 인증 없이는 콘솔에서 이메일(account_email) 동의항목 자체를 켤 수
    // 없다 — 그 상태에서 account_email scope를 요청하면 인가 단계에서 KOE205로 거부된다.
    // 그래서 기본 scope(account_email 포함)를 끄고 사업자 인증 없이도 켤 수 있는
    // 닉네임/프로필사진만 요청한다. email이 없는 건 고유 플레이스홀더로 대체(아래).
    ...(kakaoClientId
      ? {
          kakao: {
            clientId: kakaoClientId,
            clientSecret: kakaoClientSecret,
            disableDefaultScope: true,
            scope: ["profile_nickname", "profile_image"],
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
