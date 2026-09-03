# 인증 (OAuth 아님)

**상태:** plan-map은 OAuth/소셜 로그인을 쓰지 않는다 — 이 문서는 원래 다른(소셜 게시 SaaS) 참고 문서에서 "OAuth 연동" 자리였지만, 우리 프로젝트에는 해당 개념이 없어서 대신 실제로 쓰는 자체 인증 방식을 정리한다.

## 왜 OAuth를 안 쓰나

- 카카오맵/카카오모빌리티는 **로그인용 OAuth가 아니라 지도·경로 조회용 REST API 키**를 쓴다 — 사용자 인증과는 무관, [PUBLISHING.md](./PUBLISHING.md) 참고.
- 소셜 로그인(카카오 로그인 등)은 요구사항에 없다. 필요해지면 별도 문서로 새로 작성해야 한다(지금은 범위 밖).

## 실제 인증 방식

`apps/web/src/lib/auth.ts` + `app/api/auth/*`.

1. **회원가입** (`POST /api/auth/register`) — 이메일/비밀번호/닉네임. 비밀번호는 `bcryptjs`로 해싱(10 rounds), 평문 저장 안 함.
2. **로그인** (`POST /api/auth/login`) — 이메일+비밀번호 검증 후 JWT(HS256, `jsonwebtoken`)를 발급해 **httpOnly 쿠키**(`session`, `SameSite=Lax`, 30일 만료)로 내려준다.
3. **세션 확인** (`getCurrentUser()`) — 요청마다 쿠키의 JWT를 검증하고 `sub`(userId)로 사용자를 조회. 실패하면 `null` → 각 페이지/API가 `redirect("/login")` 또는 `401`로 처리.
4. **로그아웃** (`POST /api/auth/logout`) — 쿠키 삭제.

리프레시 토큰 로테이션이나 access/refresh 토큰 분리는 하지 않는다 — 세션 하나(JWT 자체)가 30일짜리 access 토큰을 겸한다. 리스크가 커지면(민감한 데이터가 늘어나면) 그때 리프레시 토큰 분리를 검토할 것.

## 시크릿

- `JWT_SECRET` — `apps/web/.env`, 랜덤 문자열로 설정 필요(플레이스홀더 그대로 두면 안 됨). 미설정 시 `lib/auth.ts`가 모듈 로드 시점에 즉시 throw해서 앱이 기동하지 않는다(조용히 안전하지 않은 기본값으로 넘어가지 않도록 하는 의도적인 설계).

## Phase 0에서 있었던 사고

기존 CRA/Express 코드에서 카카오 API 키가 하드코딩되어 공개 커밋된 적이 있다(README.md "리팩토링 배경" 참고). 이번 재작성에서는 모든 시크릿을 `.env`로 분리했지만, **유출됐던 카카오 키 자체의 재발급은 아직 사용자가 직접 해야 하는 잔여 작업**이다.

## 관련 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [API.md](./API.md)
- [PUBLISHING.md](./PUBLISHING.md)
