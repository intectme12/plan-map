# Architecture

plan-map의 실제 아키텍처 문서. 상위 개요/로드맵은 [README.md](../README.md), 화면 설계는 [DESIGN.md](../DESIGN.md)를 참고 — 이 문서는 "왜 이렇게 짰는지"에 집중한다.

## 0. 확정된 결정

| 주제 | 결정 | 근거 |
| --- | --- | --- |
| 앱 구조 | Next.js 16 App Router 단일 앱이 UI(RSC)와 API(Route Handler)를 겸함 | 화면 수가 적은 MVP 단계에서 별도 백엔드/워커 프로세스를 둘 이유가 없음. 워커·큐(Redis 등)가 필요할 만큼 무거운 비동기 작업이 없음(외부 API 호출은 전부 짧은 동기 요청) |
| 인증 | bcrypt 해싱 + JWT를 httpOnly 쿠키에 저장(`SameSite=Lax`) | 소셜 로그인/OAuth 없음 — 자체 회원가입만 지원. 세부는 [OAUTH.md](./OAUTH.md) 참고 |
| 테넌시 | 단일 사용자 계정, 모든 리소스가 `userId` 소유권 검사를 거침 | 여러 명이 같은 여행을 공동 편집하는 기능은 아직 요구사항에 없음 |
| DB | PostgreSQL + Prisma | 타입 자동 생성, PostGIS로 추후 지오 쿼리 확장 여지 |
| 지도/장소 검색/경로(자동차) | 카카오맵 JS SDK + 카카오모빌리티 REST API | 국내 POI 검색 품질 |
| 대중교통 경로 | ODsay API | 카카오는 자동차 경로만 공개 API 제공 |
| AI 일정 파싱 | Claude API(Anthropic), 구조화 출력 | 비정형 텍스트 → JSON 추출에 적합, SDK 공식 지원 |
| 사진 저장 | 로컬 디스크(`apps/web/public/uploads/`) | S3/R2 도입은 운영 단계로 후순위 — 지금 도입하면 조기 추상화 |
| 서버 상태 관리 | 보류, `fetch` + `router.refresh()` | 화면 수가 적어 TanStack Query 도입이 아직 이르다고 판단(README 참고) |
| 큐/워커 | 없음 | 외부 API 호출이 전부 초 단위로 끝나는 동기 요청이라 잡 큐가 필요 없음. 유일하게 캐시가 필요한 것(카카오/ODsay 경로)은 DB 테이블(`RouteSegment`)에 10분 TTL로 캐싱 |

## 1. 배포 토폴로지

```
[Browser] → Next.js 서버 (단일 프로세스)
              ├─ RSC 페이지 (app/trips/**)
              └─ Route Handler (app/api/**)
                    ↓
              PostgreSQL (Prisma)
                    ↓ (외부 호출, 전부 서버 사이드)
        카카오맵/모빌리티/로컬검색   ODsay   Claude API
```

- 로컬 개발: `npm run db:up`(docker-compose로 Postgres만 기동, 포트 `55432`) + `npm run dev`(Next.js dev 서버).
- 별도 워커/큐 프로세스 없음 — 참고용으로 검토했던 "API/워커 분리 + Redis 큐" 구조는 이 프로젝트 규모에는 과함(원래 검토했던 참고 아키텍처는 소셜 게시 SaaS용이라 도메인이 다름).

## 2. 계층 구조

```
Route Handler (app/api/**/route.ts)
  - getCurrentUser()로 인증 확인 → unauthorized()
  - request.json() 파싱 → zod 스키마 parse
  - 서비스 함수 호출
  - 에러는 handleRouteError()로 통일 처리
    ↓
서비스 (lib/services/*.ts)
  - 소유권 검증: prisma.trip.findFirst({ id, userId }) 없으면 NotFoundError
  - 비즈니스 로직 + Prisma 호출
    ↓
Prisma Client → PostgreSQL
```

컨트롤러/도메인/포트/어댑터로 나누는 헥사고날 구조는 채택하지 않았다 — Route Handler가 곧 컨트롤러이고, `lib/services/*.ts`가 애플리케이션 서비스 역할을 겸한다. 외부 API(카카오/ODsay/Claude)는 각각 `lib/services/*.ts` 안에 직접 fetch 호출로 구현되어 있고, 별도의 어댑터/포트 인터페이스를 두지 않았다 — 구현체가 하나뿐이라 인터페이스를 분리할 이유가 없기 때문(YAGNI).

## 3. 모듈 매핑

| 경로 접두사 | 서비스 파일 | 비고 |
| --- | --- | --- |
| `/api/auth/*` | `lib/auth.ts` | 회원가입/로그인/로그아웃/me |
| `/api/trips` | `lib/services/trips.ts` | 여행 CRUD |
| `/api/trips/[tripId]/places` | `lib/services/places.ts` | 장소 CRUD, 순서(order) 관리 |
| `/api/trips/[tripId]/routes` | `lib/services/routes.ts` | 자동차/버스 경로 조회 + 캐시 |
| `/api/trips/[tripId]/ai-parse` | `lib/services/aiParse.ts` + `geocode.ts` + `aiImport.ts` | AI 일정 자동생성(F4), 자세한 내용은 [AI.md](./AI.md) |
| `/api/trips/[tripId]/places/[placeId]/expense` | `lib/services/expenses.ts` | 장소별 지출 인라인 입력 |
| `/api/trips/[tripId]/places/[placeId]/photos` | `lib/services/photos.ts` | 로컬 디스크 사진 업로드/삭제 |

전체 엔드포인트 목록은 [API.md](./API.md) 참고.

## 4. 패키지 구조 (apps/web/src)

```
app/
  api/                      Route Handler (위 표 참고)
  trips/
    page.tsx                여행 리스트
    TripCreateForm.tsx, TripList.tsx
    [tripId]/
      page.tsx               여행 상세 (지도 + 타임라인/비용/사진 탭)
      PlaceForm.tsx, PlaceList.tsx, TripMetaEditor.tsx
      RouteSegmentRow.tsx, ExpenseInput.tsx, PlacePhotos.tsx
      ExpenseSummary.tsx, PhotoGallery.tsx
      import/                AI 일정 자동생성 화면
components/
  map/KakaoMapCanvas.tsx     카카오맵 렌더링(클라이언트 컴포넌트)
  toast/ToastProvider.tsx    삭제/실행취소 등에 쓰는 토스트
lib/
  auth.ts, db.ts, errors.ts, http.ts, validation.ts   공통 유틸
  services/                 도메인별 서비스 (위 표 참고)
```

## 5. 보안 기준선

- 비밀번호: bcrypt(10 rounds).
- 세션: JWT(HS256) + httpOnly, `SameSite=Lax` 쿠키. `JWT_SECRET` 미설정 시 앱이 기동 실패하도록 `lib/auth.ts`에서 즉시 throw.
- 모든 요청 바디는 zod로 검증(`lib/validation.ts`). 검증 실패는 `ZodError` → 400.
- 모든 변경 작업은 리소스를 로드해 `userId` 소유권을 확인한 뒤 처리(`assertTripOwnership`/`assertPlaceOwnership` 패턴). 소유권 실패는 404(존재 자체를 숨김 — IDOR 방지 목적으로 403 대신 404 사용).
- 비밀 정보는 전부 `.env`(gitignore 처리, 커밋 안 됨)로 분리 — Phase 0의 계기: 기존 CRA/Express 코드에 카카오 키가 하드코딩되어 공개 커밋된 적이 있음. 자세한 배경은 README.md "리팩토링 배경" 참고.
- 사진 업로드: MIME 타입 화이트리스트(jpg/png/webp/gif) + 8MB 크기 제한, 서버에서 검증(`lib/services/photos.ts`).

## 6. 아직 안 한 것 / 보류 중인 결정

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| shadcn/ui, lucide-react 도입 | 미도입 | DESIGN.md에는 채택 의도가 적혀 있지만 실제 코드에는 아직 안 들어감(package.json에 없음). 지금은 순수 Tailwind 유틸리티 클래스만 사용 중 — 자세한 내용은 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) |
| TanStack Query 도입 | 보류 | 화면이 늘어나 캐싱/로딩상태 반복이 생기면 그때 도입 |
| `packages/shared`(공용 타입/zod 스키마) | 보류 | 모바일(Expo) 앱이 실제로 생기기 전까지는 소비할 곳이 없는 조기 추상화 |
| `AIParseJob` 테이블(잡 큐) | 채택 안 함 | AI 파싱이 요청 1회로 끝나는 동기 흐름이라 잡 큐/상태 테이블이 불필요 — [AI.md](./AI.md) 참고 |
| 모바일 앱(Expo), 카드 자동연동 | Phase 5·6로 이연 | 외부 계정/제휴가 필요해 자동 진행 범위 밖 |

## 7. 관련 문서

| 문서 | 주제 |
| --- | --- |
| [DATABASE.md](./DATABASE.md) | Prisma 스키마 |
| [API.md](./API.md) | REST 엔드포인트 |
| [AI.md](./AI.md) | AI 일정 자동생성 |
| [OAUTH.md](./OAUTH.md) | 인증 방식(OAuth 미사용) |
| [PUBLISHING.md](./PUBLISHING.md) | 외부 API 연동 패턴 |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | 디자인 토큰 |
| [UI_RULES.md](./UI_RULES.md) | UI/UX 체크리스트 |
| [AI_CODING_RULES.md](./AI_CODING_RULES.md) | AI 코딩 에이전트용 규칙 |
| [ROADMAP.md](./ROADMAP.md) | 단계별 구현 상세 |
