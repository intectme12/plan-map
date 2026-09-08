# 인증 (OAuth 포함)

**상태:** 이메일/비밀번호 로그인과 카카오/구글/네이버 OAuth 로그인을 [better-auth](https://www.better-auth.com)(`apps/web/src/lib/betterAuth.ts`)가 함께 관장한다. 2026-09-08 이전에는 "OAuth 안 씀"이 확정 결정이었지만(이 문서가 그 결정을 기록했었다), 사용자 요청으로 뒤집혔다.

## 실제 인증 방식

1. **세션/이메일가입/OAuth 전부 better-auth**(`lib/betterAuth.ts`)가 처리한다. `lib/auth.ts`의 `getCurrentUser()`는 `auth.api.getSession()`으로 세션을 확인한 뒤 여전히 raw `User` row를 반환한다 — 이 함수를 쓰는 나머지 코드(트립/장소/공유 등 서비스 전체)는 better-auth 도입 전과 동일하게 동작한다.
2. **이메일/비밀번호**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` 라우트는 URL·요청/응답 JSON 형태를 그대로 유지하되, 내부 구현만 `auth.api.signUpEmail`/`signInEmail`/`signOut`을 호출하도록 바뀌었다. 비밀번호 해싱은 여전히 bcrypt(`lib/password.ts`)이고, better-auth의 `emailAndPassword.password.{hash,verify}` 훅에 그대로 꽂아서 도입 이전 계정의 해시와 계속 호환된다.
3. **OAuth(카카오/구글/네이버)**: `app/api/auth/[...all]/route.ts`(`toNextJsHandler`)가 `/api/auth/sign-in/social`, `/api/auth/callback/{kakao,google,naver}` 등 better-auth 내장 엔드포인트를 처리한다. 로그인/회원가입 화면의 [OAuthButtons.tsx](../apps/web/src/components/OAuthButtons.tsx)가 `authClient.signIn.social({ provider })`를 호출한다. 해당 제공자의 클라이언트 ID가 `.env`에 없으면 그 제공자는 `lib/betterAuth.ts`의 `socialProviders`에 아예 등록되지 않고, 버튼을 눌러도 에러 메시지만 뜨고 앱은 깨지지 않는다(다른 외부 API 키 미설정 패턴과 동일).
4. **세션 저장**: JWT 쿠키 대신 better-auth의 DB 세션(`sessions` 테이블)을 쓴다. 로그아웃 시 그 세션 row를 지우는 방식이라, 예전 JWT 방식과 달리 서버에서 즉시 무효화가 가능하다.

## nickname/email 관련 특이사항 (OAuth 전용)

- `User.nickname`은 `@unique`인데 OAuth 프로필 이름은 다른 회원과 겹칠 수 있어서, 각 제공자의 `mapProfileToUser`(`lib/betterAuth.ts`)에서 `isNicknameAvailable`로 확인 후 겹치면 임의의 4자리 숫자를 붙여 재시도한다.
- **카카오는 사업자 인증 없이는 이메일 동의항목을 못 받는다.** `User.email`이 `@unique` NOT NULL이라 이메일이 없으면 가입 자체가 막히므로, 카카오 계정에 이메일이 없으면 `kakao_<카카오ID>@oauth.local` 형태의 플레이스홀더로 대체한다(실제 이메일 아님 — 나중에 사업자 인증을 받으면 실 이메일을 받도록 전환 가능).
  - **콘솔에 없는 동의항목을 scope로 요청하면 인가 단계에서 카카오가 `KOE205`로 거절한다** — 이메일이 아예 안 될 걸 알면서도 better-auth 카카오 프로바이더 기본 scope(`account_email` 포함)를 그대로 요청하면 이 에러가 난다. 그래서 `kakao` 설정에 `disableDefaultScope: true` + `scope: ["profile_nickname", "profile_image"]`로 email 요청 자체를 뺐다(사업자 인증 없이도 켤 수 있는 동의항목만).
- **계정 연결(account linking)**: better-auth는 기본적으로 "로컬 계정이 `emailVerified: true`인 경우에만 같은 이메일의 OAuth를 자동 연결"한다. 이 앱은 이메일 인증 절차가 아예 없어서(회원가입 시 이메일 소유 확인 안 함) 모든 계정이 항상 `emailVerified: false`라서 이 기본값대로면 기존 이메일/비밀번호 회원은 같은 이메일의 OAuth로 영영 로그인할 수 없다(`account_not_linked` 에러). `account.accountLinking.requireLocalEmailVerified: false`로 낮춰서 해결 — 트레이드오프는 코드 주석(`lib/betterAuth.ts`) 참고. 이메일 인증 절차를 나중에 추가하면 이 설정을 다시 검토할 것.

## 시크릿

`apps/web/.env`, 전부 `.env.example`에 형식만 있고 실제 값은 비어 있다(그대로 두면 해당 기능만 비활성).

- `BETTER_AUTH_SECRET` — 세션 서명용 랜덤 문자열. 미설정 시 `lib/betterAuth.ts`가 모듈 로드 시점에 즉시 throw(기존 `JWT_SECRET`과 동일한 안전장치).
- `BETTER_AUTH_URL` — 로컬은 `http://localhost:3000`.
- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` — [Google Cloud Console](https://console.cloud.google.com), 리디렉션 URI `{BETTER_AUTH_URL}/api/auth/callback/google`.
- `KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET` — [Kakao Developers](https://developers.kakao.com), 리디렉션 URI `{BETTER_AUTH_URL}/api/auth/callback/kakao`. 카카오맵/모빌리티용 `KAKAO_REST_API_KEY`([PUBLISHING.md](./PUBLISHING.md))와는 완전히 별개 앱/키다.
- `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET` — [Naver Developers](https://developers.naver.com), 리디렉션 URI `{BETTER_AUTH_URL}/api/auth/callback/naver`.

## 마이그레이션 메모 (better-auth 도입, 2026-09-08)

- `User`에 `emailVerified`(Boolean)/`updatedAt` 추가, `passwordHash`는 nullable로 변경(OAuth 전용 계정은 값이 없음). 새 `Session`/`Account`/`Verification` 테이블 추가 — 컬럼 구성은 better-auth가 요구하는 표준 스키마 그대로.
- **`passwordHash` 컬럼은 이제 레거시다** — 로그인은 `Account`(providerId=`"credential"`)의 `password`를 쓴다. 도입 당시 기존 회원 전원을 `apps/web/scripts/migrate-passwords-to-accounts.mjs`로 1회성 이관했다(재실행해도 안전, 이미 있으면 건너뜀). `passwordHash` 컬럼 자체는 안전망으로 당장은 남겨뒀고, 나중에 별도 마이그레이션으로 제거 검토.
- 이 세션에서 발견: 이전에 이미 적용된 마이그레이션(`20260907120000_add_trip_visibility_and_shares`)이 적용 후에 수정된 적이 있어(다른 커밋에서 `DROP INDEX` 제거) `prisma migrate dev`가 체크섬 불일치로 "스키마 리셋 필요"를 요구했다. 리셋은 실 데이터를 날리는 작업이라 대신 `prisma db push`로 무손실 반영한 뒤, 마이그레이션 파일은 손으로 작성해 `prisma migrate resolve --applied`로 이력만 맞췄다(migration.sql 파일이 실제 DB에 적용된 SQL과 정확히 일치하는지 재확인은 못 했음 — 다음에 새 마이그레이션을 만들 때 이 히스토리 드리프트가 다시 걸릴 수 있으니 유의). 자세한 내용은 README "진행 상황" 참고.

## 관련 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [API.md](./API.md)
- [PUBLISHING.md](./PUBLISHING.md)
