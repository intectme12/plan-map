# plan-map

카카오맵 기반 여행 일정 관리 서비스. 장소를 검색/저장하고, 교통수단별 이동시간을 계산해 경로를 구성하며, AI가 여행 텍스트를 분석해 일정을 자동 생성해준다.

## 실행 방법

이 프로젝트는 프론트엔드와 백엔드가 분리된 별도 서버가 아니라, **`apps/web`(Next.js) 하나가 화면과 API(Route Handler)를 동시에 서빙한다.** "백엔드"는 별도로 띄우는 프로세스가 아니라 `apps/web/src/app/api/**/route.ts`들이다. 실제로 띄워야 하는 건 ①Postgres(Docker) ②Next.js dev 서버, 이 두 가지뿐이다. (레거시 `client/`(CRA)·`server/`(Express)는 `apps/web`으로 완전히 대체되어 더 이상 실행하지 않으며, 2026-09-07에 디스크에서도 삭제함 — 아래 "진행 상황" 참고)

### 한번에 올리고 내리기

```bash
./up.sh    # Postgres 기동 → 마이그레이션 적용 → Next.js dev 서버를 백그라운드로 기동
./down.sh  # Next.js dev 서버 종료 → Postgres 정지
```

- 최초 1회는 `apps/web/.env`를 `apps/web/.env.example`을 복사해서 만들어둬야 한다(`cp apps/web/.env.example apps/web/.env`). 카카오/Anthropic 키는 없어도 앱은 뜨고, 해당 기능만 "키 설정 필요" 안내로 대체된다.
- `up.sh`가 띄운 dev 서버 로그: `tail -f .dev-server.log`
- 접속: http://localhost:3000

### 수동으로 띄우기 (스크립트 없이)

```bash
docker compose up -d db                 # Postgres
npm install                             # 최초 1회, 반드시 루트에서 실행(npm workspaces) — apps/web 안에서 실행하면 안 됨, 아래 "이 환경 관련 참고사항" 참고
cd apps/web
npx prisma migrate deploy               # 스키마 변경이 있었다면
npm run dev                             # http://localhost:3000, Ctrl+C로 종료
```

## 리팩토링 배경

기존 CRA + Express/Sequelize 구조에서 카카오 API 키 하드코딩(공개 커밋), 평문 비밀번호 저장, Redux 리듀서 내부 사이드이펙트, 지도 로직 3중 중복 등의 문제가 발견되어 아키텍처를 재설계한다. 기능 요구사항이 확장되면서(AI 자동생성, 사진첩 연동, 만보기) 웹 단독으로는 감당 안 되는 항목(사진첩 자동연동, 만보기/GPS)이 생겨, **모바일 전용 기능은 고도화 단계로 미루고 웹부터 작업**한다.

## 기능 요구사항

| # | 요구사항 | 비고 |
|---|---|---|
| F1 | 여행계획 생성/수정/삭제 | 웹 1차 |
| F2 | 지도 API로 장소 검색·저장 | 웹 1차 |
| F3 | 자동차 실시간 경로·소요시간(실제 도로 경로 표시) | 웹 1차. 대중교통은 2026-09-04에 범위에서 제외(아래 로그 참고) |
| F4 | AI가 여행 텍스트 분석 → 마커·경로 자동생성 | 웹 1차 |
| F5 | 전체 CRUD | 웹 1차 |
| F6 | 장소별 지출 기록 (추후 카드 자동연동) | 웹 1차: 수동입력, 카드연동은 별도 규제검토 필요해 후순위 |
| F7 | 장소별 사진 저장 (사진첩 연동) | 웹: 업로드만 / **사진첩 자동연동은 모바일 단계** |
| F8 | 만보기·실제 이동거리 (위치 권한) | **모바일 전용, 고도화 단계로 이연** |

## 아키텍처

```
apps/
  web/      Next.js (App Router, TypeScript) — 계획 편집 UI + API Route Handler
```

모바일(Expo) 클라이언트는 F7 사진첩 자동연동, F8 만보기/GPS가 필요해지는 시점에 별도 앱으로 추가한다. 그전까지 web이 API 서버 역할까지 겸한다. `packages/shared`(공용 타입/zod 스키마)는 모바일 앱이 실제로 생기기 전까지는 만들지 않는다 — 지금은 소비할 곳이 없는 조기 추상화라서 보류.

더 자세한 문서는 [`docs/`](./docs) 참고: [ARCHITECTURE.md](./docs/ARCHITECTURE.md)(설계 배경), [API.md](./docs/API.md)(엔드포인트), [DATABASE.md](./docs/DATABASE.md)(스키마), [AI.md](./docs/AI.md)(AI 자동생성 상세), [PUBLISHING.md](./docs/PUBLISHING.md)(외부 API 연동 패턴), [OAUTH.md](./docs/OAUTH.md)(인증 방식), [DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)/[UI_RULES.md](./docs/UI_RULES.md)/[AI_CODING_RULES.md](./docs/AI_CODING_RULES.md)(디자인/UX/AI 코딩 규칙), [ROADMAP.md](./docs/ROADMAP.md)(단계별 구현 로그).

## 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 웹 프론트 + API | Next.js 16 (App Router, Turbopack) + TypeScript | SSR로 지도/편집 UI 빠른 로딩, Route Handler로 별도 백엔드 없이 API 겸용. `middleware`가 `proxy`로 개명되는 등 15 이전 문서와 다른 부분이 있어 로컬 `node_modules/next/dist/docs`를 기준으로 개발 |
| 모노레포 | npm workspaces | pnpm 미설치 환경이라 npm workspaces로 대체(기능상 차이 없음) |
| DB | PostgreSQL(Docker) + Prisma | PostGIS로 추후 이동거리/경로 비교 등 지오 쿼리 확장 용이, 타입 자동 생성 |
| 서버 상태 관리 | (보류) 우선 fetch + `router.refresh()` | 화면 수가 적은 지금은 TanStack Query 도입이 조기 추상화. 화면이 늘어나 캐싱/로딩상태 반복이 생기면 그때 도입 |
| 지도 | 카카오맵 JS SDK | 국내 POI 검색 품질, 기존 로직 재사용. 현재는 키 미설정으로 자리표시자만 렌더 |
| 인증 | bcrypt 해싱 + JWT(httpOnly 쿠키) | 평문 비밀번호/파일세션 문제 해결 |
| 검증 | zod | 요청 검증 + 타입 동시 확보 |
| AI 파싱(F4) | Claude API (tool use) | 비정형 텍스트 → 구조화 일정 JSON 추출 (미착수) |
| 경로(F3) | 카카오모빌리티(자동차만) | 실제 도로 vertexes로 지도에 경로 표시. 대중교통(ODsay)은 2026-09-04에 제외 |
| 스토리지 | Supabase Storage 또는 R2 | 사진 업로드, 운영 부담 최소화 (미착수) |

## 데이터 모델 (초안)

```
User        — id, email, password_hash, nickname
Trip        — id, user_id, name, date_range, personnel
PlaceEntry  — id, trip_id, order, name, lat/lng, address, category, phone, place_url, scheduled_time
RouteSegment— from_place_id, to_place_id, distance, duration, fare, path(실제 도로 좌표)
Expense     — id, place_entry_id, amount, category(음식|교통|입장권|숙소|기타), memo, source(manual|card_auto)
Photo       — id, place_entry_id, storage_key, taken_at
AIParseJob  — id, trip_id, raw_text, parsed_json, status
```

## 로드맵

- [~] **Phase 0 — 긴급 보안 조치**: 새 코드는 시크릿을 전부 `.env`로 분리해 하드코딩 재발 방지 완료. `client/`·`server/` 내 중첩 `.git` 정리 완료(2026-09-04, 아래 참고). **미완료(사용자 조치 필요): 유출됐던 카카오 API 키 재발급**, DB 비밀번호 변경
- [x] **Phase 1 — 웹 MVP**: F1·F5 완료, F2는 수동 좌표 입력까지(자동완성은 카카오 키 필요)
- [x] **Phase 2 — 경로/교통**: 코드·UI 완료, 실제 조회는 API 키 설정 후 활성화 (F3)
- [x] **Phase 3 — AI 자동생성**: Claude API 파싱(구조화 출력) + 카카오 로컬 검색 지오코딩 매칭 + 사용자 확인 UI(`/trips/[tripId]/import`) (F4). 코드 완료 + 폴백 경로까지 브라우저로 검증됨. 실제 파싱 결과는 `ANTHROPIC_API_KEY`/`KAKAO_REST_API_KEY` 설정 후 최종 확인 필요
- [x] **Phase 4 — 비용/사진 기본형**: 지출 인라인 입력, 사진 업로드/삭제 (F6, F7 웹 범위) — 코드·DB 반영·브라우저 검증까지 완료
- [ ] **Phase 5 (고도화) — 모바일 앱**: Expo 앱, 사진첩 자동연동, 만보기/GPS (F7 완성, F8) — **웹 우선 진행이라는 기존 결정에 따라 이번 자동 진행 범위에서 제외**
- [ ] **Phase 6 (장기) — 카드 자동연동**: 오픈뱅킹/코드에프 등 제휴 검토 (F6 고도화) — **실제 금융기관 제휴가 필요해 코드만으로는 완료 불가, 계정 생성 등 실제 사업자 절차는 사용자 본인이 진행해야 함**

현재 단계: **Phase 1~4 완료, 실제 카카오 키로 지도/경로/장소검색 확인 완료** — 대중교통은 범위 제외. 남은 건 Phase 0 잔여 정리(카카오 키 재발급)뿐

## ⚠️ 이 환경 관련 참고사항

- **Prisma 클라이언트가 최초 `npm install` 시 자동 생성되지 않는다** — npm의 `allow-scripts` 정책이 `@prisma/client`/`prisma`의 postinstall/preinstall 스크립트를 차단해서, 스키마 기반 타입이 생성되지 않은 빈 stub 클라이언트만 남는다. 증상: `trip.places` 등 Prisma 조회 결과가 `any`로 추론되며 `tsc`에서 관련 없어 보이는 implicit-any 에러가 다수 발생. **`npm install` 후에는 반드시 `cd apps/web && npx prisma generate`를 한 번 실행**해야 한다(이번 세션에서 실행 완료).
- **Next.js 16의 `LayoutProps` 등 전역 라우트 타입은 `next dev`/`next build`를 한 번도 안 돌리면 존재하지 않는다** — `npx next typegen`으로 미리 생성 가능(이번 세션에서 실행 완료). 그 전에는 `layout.tsx`의 `LayoutProps<"/">` 참조가 "Cannot find name" 에러로 뜨는데, 코드 버그가 아니라 타입 생성 누락임.
- **Docker Desktop이 이 환경에서 실행되지 않는다** — CLI는 설치돼 있지만 WSL(Linux용 Windows 하위 시스템) 자체가 설치 안 되어 있어(`wsl -l -v` → "설치되어 있지 않습니다") Docker Desktop의 엔진이 못 뜬다(`docker info`에 서버 정보 없음, 프로세스도 안 떠 있음). WSL 설치(`wsl --install`)는 관리자 권한+재부팅이 필요해 자동으로 처리하지 않음. **대안(2026-09-07부터 이 방식 사용 중)**: Docker 대신 Neon(neon.tech, 무료 호스티드 Postgres)을 만들어 `apps/web/.env`의 `DATABASE_URL`을 그 연결 문자열로 바꿔서 사용 — 이러면 `docker-compose.yml`/`up.sh` 없이도 DB가 필요한 화면 전부(로그인 제출, `/trips` 이후 전체) 이 환경에서 정상 검증 가능. `.env`는 gitignore 대상이라 각자 알아서 자신의 `DATABASE_URL`을 설정해야 함(Docker든 Neon이든 다른 호스티드 Postgres든 무엇이든 상관없이 `schema.prisma`의 `datasource db { provider = "postgresql" }`와 호환되는 연결 문자열이면 됨).
- **`npm install`만으로는 Windows용 네이티브 바이너리가 안 깔려서 `next dev` 자체가 빌드 에러로 죽는다** — `lightningcss`, `@tailwindcss/oxide`(Tailwind v4가 쓰는 Rust 바이너리)의 `-win32-x64-msvc` optional dependency가 설치되지 않는 npm 버그. 증상: `next dev` 실행 시 `globals.css` 처리 중 `Cannot find module '...win32-x64-msvc.node'` Build Error. 해결(이번 세션에서 실행 완료, 재현되면 다시 실행):
  ```bash
  cd apps/web
  npm install lightningcss-win32-x64-msvc --no-save
  npm install @tailwindcss/oxide-win32-x64-msvc@4.3.3 --no-save
  ```
  그래도 안 되면(Turbopack이 새로 설치된 패키지를 못 찾는 경우) `.node` 바이너리를 각 패키지가 기대하는 폴백 경로에 직접 복사하고 `.next` 캐시를 지운 뒤 재시작:
  ```bash
  cp node_modules/lightningcss-win32-x64-msvc/lightningcss.win32-x64-msvc.node \
     node_modules/lightningcss/lightningcss.win32-x64-msvc.node
  cp node_modules/@tailwindcss/oxide-win32-x64-msvc/tailwindcss-oxide.win32-x64-msvc.node \
     node_modules/@tailwindcss/oxide/tailwindcss-oxide.win32-x64-msvc.node
  rm -rf .next
  ```
  (`@tailwindcss/oxide-win32-x64-msvc`는 npm workspaces 호이스팅으로 루트 `node_modules`에 설치될 수 있음 — 그 경우 첫 번째 `cp`의 소스 경로를 `../../node_modules/...`로 바꿀 것.)
- **DB 없이 프런트만 확인하려면**: `cd apps/web && npm run dev` → `http://localhost:3000` — `/`는 미인증 시 `/login`으로 리다이렉트되는데, `getCurrentUser()`가 쿠키 없으면 DB 조회 자체를 안 해서 `/login`·`/register` 화면은 정상 렌더링된다(2026-09-03 확인). 폼 **제출**과 `/trips` 이후는 DB가 필요해 실패한다.
- **`apps/web` 안에 `package-lock.json`이 다시 생기면 절대 커밋하지 말 것**: 이 프로젝트는 npm workspaces라 lock 파일은 루트 하나(`/package-lock.json`)여야 한다. `apps/web` 안에 별도 lock 파일이 있으면 Next.js 16(Turbopack)이 "가장 가까운 lock 파일이 있는 폴더"를 프로젝트 루트로 자동 추론해 `apps/web`을 루트로 오인하고, 그 바깥(진짜 루트) `node_modules`의 패키지(`tw-animate-css`, `shadcn` 등)를 전혀 resolve하지 못해 `globals.css`가 `CssSyntaxError: Can't resolve '...'`로 500 에러를 낸다(`apps/web/node_modules/next/dist/docs/.../turbopack.md`의 "Root directory" 항목 참고). 2026-09-07에 실제로 이 문제가 발생해 `apps/web/package-lock.json`(2026-09-03에 실수로 커밋된 것)을 제거해 해결함. `npm install`은 항상 루트에서만 실행할 것 — `apps/web`에서 직접 실행하면 이 lock 파일이 다시 생길 수 있다.

## 진행 상황

이 섹션은 매 작업 세션 후 갱신한다. Phase 5(모바일)·Phase 6(카드 연동)은 외부 계정/제휴가 필요해 자동 진행 범위에서 제외했다. Phase 3(AI 자동생성)은 한 세션에서 보류됐다가 이후 세션(2026-09-03)에 재개 요청을 받아 코드를 완료했다.

**완료 (Phase 1)**
- 모노레포(npm workspaces) + `apps/web`(Next.js 16 + TS + Tailwind) 스캐폴딩
- Postgres를 docker-compose로 로컬 구동(`localhost:55432`), Prisma 스키마(User/Trip/PlaceEntry/Expense/Photo) + 마이그레이션
- 인증: 회원가입/로그인/로그아웃/me, bcrypt 해싱 + JWT httpOnly 쿠키
- Trip·PlaceEntry CRUD API(`/api/trips`, `/api/trips/[tripId]/places`) — 전 요청 소유권 검증 포함
- 여행 리스트/상세 화면(지도 배경 + 오른쪽 타임라인 패널 레이아웃)
- 여행 정보 인라인 수정, 장소 드래그 순서변경(`@dnd-kit`, 500ms 디바운스 저장)
- 삭제 전부 토스트+5초 실행취소 방식으로 전환(`confirm()`/`alert()` 미사용), 여행 리스트에서도 삭제 가능
- 브라우저 수동 테스트로 회원가입→로그인→CRUD→드래그 정렬→삭제/실행취소→로그아웃→미인증 접근 차단까지 확인

**완료 (Phase 2)**
- `RouteSegment` 모델 추가(출발지·도착지·수단별 캐시, 10분 TTL)
- 자동차 경로: 카카오모빌리티 Directions API 서버 프록시(`lib/services/routes.ts`) — `KAKAO_REST_API_KEY` 필요
- 대중교통(버스) 경로: ODsay API 연동 코드 작성 — `ODSAY_API_KEY` 필요
- 두 경우 모두 키 미설정 시 에러 대신 "교통 API 키 설정 필요"로 안전하게 표시(카카오맵과 동일 패턴)
- 타임라인에 장소 간 차/버스 토글 + 소요시간·거리·요금 표시, 토글 시 `transportToNext` 저장
- 브라우저 테스트로 키 미설정 상태의 정상 폴백, 모드 전환 시 DB 반영까지 확인. 개발 중 `prisma migrate dev` 이후 dev 서버 재시작 안 해서 생긴 500 에러(`prisma.routeSegment` undefined)를 재현·수정함 — **스키마 변경 후에는 dev 서버 재시작 필요**

**완료 (Phase 3)**
- `AiParseRequest` 대신 상태 없는 동기 플로우로 구현 — 별도 `AIParseJob` 테이블 없이 요청 1회로 파싱→지오코딩→확인 응답까지 처리(화면 수가 적은 지금은 잡 큐가 조기 추상화라 보류, README 데이터 모델 초안의 `AIParseJob`은 미적용)
- `lib/services/aiParse.ts`: Claude API(`claude-opus-5`, `messages.parse` + zod 구조화 출력)로 원문 텍스트에서 장소명/카테고리/지역힌트 추출
- `lib/services/geocode.ts`: 카카오 로컬 키워드 검색으로 장소명 → 좌표 후보(최대 5개) 매칭, 카카오 키 미설정 시 다른 서비스와 동일하게 안전 폴백(빈 후보)
- `lib/services/aiImport.ts`: 소유권 검증 후 위 둘을 조합, `ANTHROPIC_API_KEY` 미설정 시 503 에러로 명확히 알림(카카오/ODsay와 달리 이 기능은 키 없이 대체 동작 불가)
- `POST /api/trips/[tripId]/ai-parse`: 텍스트 → 후보 목록 반환
- `/trips/[tripId]/import` 확인 화면: 텍스트 붙여넣기 → 스켈레톤 로딩 → 후보 카드 리스트(체크박스 기본 선택, 동명 장소는 노란 뱃지+선택 드롭다운) + 지도 마커 → "선택한 N개 일정에 추가" 일괄 커밋(기존 `/places` API 순차 호출, order 충돌 방지 위해 병렬 실행 안 함)
- `tsc --noEmit`, `eslint` 통과 확인(단, `npx prisma generate` + `npx next typegen`을 먼저 실행해야 함 — 위 "이 환경 관련 참고사항" 참고). **미확인**: 이 환경은 Docker를 실행할 수 없어 브라우저로 로그인→여행 생성→AI 가져오기 전체 플로우를 실행해보지 못함

**완료 (Phase 4)**
- `lib/services/expenses.ts`: `setPlaceExpense` — 장소당 대표 지출 1건을 upsert로 즉시저장(카드 인라인 입력에 맞춘 단순화, Expense 모델 자체는 장소당 여러 건을 허용하지만 UI는 1건만 다룸)
- `lib/services/photos.ts`: 로컬 디스크 저장(`apps/web/public/uploads/<tripId>/<placeId>/<uuid>.<ext>`) — jpg/png/webp/gif만 허용, 8MB 제한, storageKey를 public 상대경로로 저장해 별도 서빙 라우트 없이 바로 `<img src>`로 노출. S3/R2는 스택 표에 명시된 대로 후순위
- `PATCH /api/trips/[tripId]/places/[placeId]/expense`, `POST`/`DELETE /api/trips/[tripId]/places/[placeId]/photos(/[photoId])` 라우트 추가
- 여행 상세 화면에 `?tab=timeline|expense|photos` 탭 추가(DESIGN.md IA 반영) — 타임라인 탭은 기존 카드에 지출 입력 인풋 + 사진 썸네일(최대 3장, `+`로 업로드 모달) 추가, 비용 탭은 총액 큰 숫자 + 카테고리별(장소의 `category` 필드 기준) 도넛 차트(CSS `conic-gradient`, 별도 차트 라이브러리 없이 구현), 사진 탭은 장소별 그룹 그리드
- 업로드 모달은 Radix/shadcn 없이 직접 구현(고정 오버레이 + 드래그앤드롭 + 파일선택) — DESIGN.md는 shadcn/ui 도입을 명시했지만 아직 코드에 들어있지 않아 이번에 새로 끌어들이지 않음. 도입하려면 별도 세션에서 결정 필요
- `AIParseJob`처럼 `Expense`도 카테고리 필드가 없어, 비용 탭의 카테고리 분류는 지출 자체가 아니라 **장소(PlaceEntry)의 category**로 묶음 — 장소에 카테고리를 안 채우면 "기타"로 집계됨
- `tsc --noEmit`, `eslint` 통과 확인. 브라우저 E2E는 Phase 3와 동일한 이유로 미확인

**완료 (2026-09-03, 사용자 피드백 반영 — 교통 UI 개편 + 장소검색)**
- 실제 카카오/Anthropic API 키를 `.env`에 설정 — 이후 세션은 이 세 키(`NEXT_PUBLIC_KAKAO_JS_KEY`/`KAKAO_REST_API_KEY`/`ANTHROPIC_API_KEY`)가 채워진 상태를 전제로 진행
- 장소 간 교통수단이 "차/버스 토글"이던 걸 폐기하고, **자차(거리/시간) + 택시(카카오모빌리티 예상요금) + 대중교통(거리/시간)을 항상 동시에** 보여주도록 [RouteSegmentRow.tsx](apps/web/src/app/trips/[tripId]/RouteSegmentRow.tsx) 재작성. 대중교통은 ODsay `subPath`를 파싱해 실제 지하철 노선/버스 번호·정류장 구간까지 표시 — `RouteSegment.detail`(JSONB) 컬럼 추가(마이그레이션 `20260903140000_add_route_segment_detail`, DB가 꺼져 있어 손으로 작성 — Docker 켜지면 다음 `prisma migrate deploy`/`dev` 때 자동 적용됨)
- 장소 추가 폼의 위도/경도 직접 입력을 폐지하고 **카카오 장소검색**(`GET /api/places/search`, 기존 AI 파싱용 `geocode.ts` 재사용)으로 교체 — 검색어 입력 → 결과 클릭 한 번으로 추가
- `tsc --noEmit`, `eslint` 통과 확인(교통 UI 두 컴포넌트에 남은 `react-hooks/set-state-in-effect` 경고는 이전부터 있던 패턴과 동일해 그대로 둠). **실제 카카오 API 응답까지 직접 호출해서 확인**하다가 콘솔 설정 문제 2개를 발견 → 사용자가 카카오 디벨로퍼스 콘솔에서 조치 완료, 재확인함(2026-09-03):
  - ~~`KAKAO_REST_API_KEY` 호출이 `403 App(map) disabled OPEN_MAP_AND_LOCAL service`로 실패~~ → 콘솔에서 카카오맵(Local/Map) 제품 활성화 후 **200 정상 확인**(장소검색 `경복궁`, 카카오모빌리티 경로조회 둘 다)
  - ~~`NEXT_PUBLIC_KAKAO_JS_KEY`로 지도 SDK 로드 시 `401`~~ → 콘솔에서 Web 플랫폼에 `http://localhost:3000` 등록 후 **200 정상 확인**(`Referer: http://localhost:3000/`로 직접 호출)
  - ODsay는 `ODSAY_API_KEY` 자체가 아직 미발급이라 `subPath` 파싱 로직은 실제 응답으로 검증 못 함(ODsay 공식 문서 스펙 기준으로 작성)
- 이 과정에서 DB 없이 프런트만 보려고 `trips/page.tsx`·`trips/[tripId]/page.tsx`에 임시로 넣었던 로그인 우회 mock 코드(`lib/devMock.ts`)는 **커밋 전에 전부 원래 코드로 되돌리고 삭제함** — 인증 우회 코드가 레포에 남지 않도록 확인 필요

**완료 (2026-09-04, Docker 가능한 환경에서 Phase 3·4 브라우저 검증)**

이 머신은 Docker가 실행되므로, 위에서 "이 환경에서는 불가능"으로 남겨뒀던 E2E 검증을 대신 진행했다. 로컬 `.env`에는 실제 카카오/Anthropic 키가 없어서(각 머신의 `.env`는 gitignore 대상이라 공유되지 않음) AI·지도·경로 관련 기능 자체는 여전히 폴백 상태로 확인했지만, DB에 의존하는 로직(지출/사진 CRUD, 폴백 메시지 분기)은 실제로 실행해서 검증했다:

- `git pull` 후 `npx prisma migrate deploy`로 `route_segments.detail` 컬럼 마이그레이션을 로컬 Docker Postgres에 정상 적용
- 지출 입력: 카드 인라인 입력 → blur 시 즉시 저장 → DB 반영, 비용 탭 총액/도넛 차트 반영까지 확인
- 사진: 업로드(API에 실제 PNG 파일 전송, `public/uploads/<tripId>/<placeId>/`에 저장), 갤러리 표시, 모달에서 hover 삭제까지 — DB 레코드와 디스크 파일이 함께 삭제되는 것까지 확인
- AI 파싱: `ANTHROPIC_API_KEY` 미설정 시 "AI 자동생성 기능을 사용하려면 ANTHROPIC_API_KEY 설정이 필요합니다" 메시지로 정상 폴백(에러 없이)
- 장소검색: `KAKAO_REST_API_KEY` 미설정 시 "장소 검색을 사용하려면 .env의 KAKAO_REST_API_KEY를 설정하세요" 메시지로 정상 폴백
- **버그 발견 및 수정**: `PlaceList.tsx`의 `<DndContext>`가 `id`를 지정하지 않아 dnd-kit이 내부적으로 자동생성하는 `aria-describedby` ID가 서버 렌더링과 클라이언트 하이드레이션 사이에 달라져 React 하이드레이션 경고(`Console Error: A tree hydrated but some attributes...`)가 발생하고 있었음. `<DndContext id={\`place-list-${tripId}\`}>`로 안정적인 id를 지정해 수정, 재현 확인

**완료 (2026-09-04, Phase 0 중첩 git 정리 + 실행 스크립트/문서화)**
- `client/`(CRA) 안에 남아있던 별도 `.git`(origin: `react-practice` 레포, 커밋 4개)을 제거해 중첩 git 문제 해소. 커밋 이력 자체는 그 레포에 이미 푸시되어 있어 필요하면 거기서 복구 가능
- `client/`·`server/`는 `apps/web`으로 완전히 대체된 레거시라 삭제하지 않고 루트 `.gitignore`에 추가만 함 — 디스크엔 참고용으로 남지만 `git status`에 더 이상 안 잡힘
- 루트에 `up.sh`/`down.sh` 추가: Postgres 기동/마이그레이션/Next.js dev 서버 기동을 한 번에, 종료도 한 번에. 두 스크립트 모두 직접 실행해서 기동→응답 200→종료→재기동까지 확인
- README에 "실행 방법" 섹션 추가 — 이 프로젝트는 프론트/백엔드가 물리적으로 분리되어 있지 않고 `apps/web` 하나가 화면+API를 겸한다는 점을 명시

**완료 (2026-09-04, 실제 카카오 키로 지도/경로 확인 + 지도-탭 연동 + 비용 카테고리화)**

사용자가 카카오 디벨로퍼스에서 새 키를 발급받아 `.env`에 넣어줘서, 이번엔 지도가 실제로 렌더링되는 상태에서 작업/검증했다.

- **장소 간 이동경로를 지도에 표시**: `KakaoMapCanvas`가 `segments` prop을 받아 연속된 장소 사이에 `Polyline`을 그림 — 자차 구간은 파란 실선, 버스 구간은 주황 점선(장소의 `transportToNext` 값 기준). 실제 도로를 따라가는 좌표가 아니라 두 지점을 잇는 직선이라는 점은 의도적 범위 설정(도로 지오메트리까지 그리려면 카카오모빌리티 응답에서 `vertexes`를 추출해야 해서 범위가 커짐 — 필요해지면 다음 단계로)
- **타임라인/비용/사진 탭에서 장소 클릭 시 지도 이동**: 지도와 세 탭을 감싸는 클라이언트 컴포넌트 `TripWorkspace`를 새로 만들어 `selectedPlaceId` 상태를 하나로 공유. `KakaoMapCanvas`는 이 값이 바뀌면 `map.panTo()`로만 이동(마커·경로선은 다시 안 그림). 기존엔 `page.tsx`(서버 컴포넌트)가 지도와 탭 콘텐츠를 따로 렌더링해서 탭 간에 상태를 공유할 방법이 없었음 — `page.tsx`는 데이터 fetch만 하고 `TripWorkspace`에 넘기는 구조로 정리
- **비용/사진을 눌러도 지도가 안 움직이게**: "장소 선택" 클릭 핸들러를 장소 이름 텍스트에만 달아서(카드 전체가 아니라), 비용 입력·사진 추가 버튼과 이름이 형제 요소로 분리되게 함. 추가로 지출 패널과 사진 모달 트리거에는 `e.stopPropagation()`도 걸어둠(이중 방어)
- **비용 탭에 장소별 금액 표시**: `ExpenseSummary`가 `places: {id,name,total}[]`를 받아 카테고리 도넛차트 아래에 장소별 지출 목록을 렌더링, 클릭하면 지도 이동. 카테고리 집계도 기존엔 `PlaceEntry.category`(장소 종류)로 잘못 묶고 있던 걸 이번에 실제 `Expense.category`로 고쳐서 바로잡음
- **타임라인 지출을 카테고리별 다건 입력으로 개편**: `Expense`에 `category`(음식/교통/입장권/숙소/기타) 필드 추가. 기존 "장소당 지출 1건 upsert" 방식(`setPlaceExpense`)을 폐기하고 `addPlaceExpense`/`deletePlaceExpense`로 교체 — 카드에는 총액만 보이고 "비용 입력" 버튼을 누르면 기존 항목 목록(카테고리 뱃지+금액+삭제) 아래 카테고리 선택+금액 입력 폼이 펼쳐짐. API도 `PATCH .../expense`(단수) → `POST/DELETE .../expenses(/[expenseId])`(복수)로 교체
- 마이그레이션 두 개 적용(`add_expense_category` 등). 이 과정에서 로컬 Docker DB에 이전 세션에서 만들었다가 origin 리셋으로 파일만 사라진 `ai_parse_jobs` 테이블이 드리프트로 남아있던 걸 발견 — `prisma migrate reset`은 전체 데이터 삭제라 자동 차단돼서, `prisma db execute`로 그 테이블만 정확히 지우고 마이그레이션 기록만 정리하는 방식으로 기존 테스트 데이터 보존한 채 해결
- **버그**: 스키마 변경(`prisma migrate dev`) 후 dev 서버를 안 그로 인해 "Unknown argument `category`"로 지출 추가가 500 에러 나는 걸 재현 — `./down.sh && ./up.sh`로 재시작하면 해결됨(README에 이미 있는 주의사항, 재확인)
- 브라우저로 전체 플로우 확인: 실제 지도 렌더링, 경로선 표시(버스=점선 실제 확인), 타임라인/비용/사진 탭에서 장소 클릭 시 지도 이동, 비용·사진 버튼 클릭 시 지도 고정, 카테고리별 지출 추가(음식 32,000 + 교통 15,000 = 47,000원 합산), 비용 탭 장소별 목록
- 새로 작성한 `TripWorkspace.tsx`의 `useMemo`에서 `let total += ...` 패턴이 `react-hooks/immutability` 린트 에러를 내서 `reduce` 기반으로 다시 씀(기존 코드에 있던 다른 2건의 `set-state-in-effect` 경고는 그대로 둠 — 이전부터 있던 것)

**완료 (2026-09-04, 대중교통 제거 + 실제 도로 경로 + 장소 선택 시 확대)**

- **대중교통(버스/ODsay) 전면 제거**: 사용자 요청으로 자동차만 남김. `RouteSegment.mode`/`detail`(지하철·버스 상세) 컬럼, `PlaceEntry.transportToNext` 컬럼 전부 삭제. `RouteSegmentRow`는 이제 🚗자차 + 🚕택시 예상요금만 표시. `routes.ts`의 `fetchBusRoute`/ODsay 연동 코드 삭제 — 나중에 대중교통을 다시 붙이고 싶으면 이번에 지운 커밋을 참고
- **이동경로를 실제 도로 지오메트리로 표시**: 카카오모빌리티 응답의 `routes[].sections[].roads[].vertexes`(도로를 따라가는 좌표 배열)를 추출해 `RouteSegment.path`(JSONB)에 저장. `KakaoMapCanvas`는 이 좌표가 있으면 실제 도로 모양대로 `Polyline`을 그리고, 없으면(키 미설정 등) 두 지점을 잇는 직선으로 폴백. `RouteSegmentRow`가 이미 같은 캐시(`RouteSegment`, 10분 TTL)를 쓰기 때문에 지도용으로 별도 호출해도 대부분 DB 캐시 히트라 비용이 크지 않음
- **장소 클릭 시 50m 축척으로 확대**: `map.setLevel(3)` + `panTo()`를 함께 호출. 카카오맵 축척 표시가 정확히 "50m"로 뜨는 레벨을 브라우저에서 직접 확인해서 하드코딩(`SELECTED_PLACE_ZOOM_LEVEL = 3`)
- 스키마 변경(컬럼 삭제 2개, 유니크 제약 변경) 마이그레이션은 `prisma migrate dev`가 이 환경(비대화형 셸)에서 데이터 손실 경고에 막혀 실행이 안 돼서, `prisma migrate diff`로 SQL을 뽑은 뒤 직접 마이그레이션 파일을 작성 — 기존 자동차/버스 두 행이 있던 `route_segments` 쌍은 새 유니크 제약과 충돌하니 버스 행을 먼저 지우는 `DELETE`를 마이그레이션 맨 앞에 추가해서 처리
- **버그**: 마이그레이션 적용 후 `.next` 캐시가 이전 Prisma Client를 계속 참조해서 "column transportToNext does not exist" 500 에러가 재발 — dev 서버 재시작만으론 해결 안 됐고 `rm -rf apps/web/.next`까지 해야 완전히 해소됨. **스키마를 바꾸는 컬럼 삭제/이름변경이 있었다면 재시작뿐 아니라 `.next` 캐시도 지울 것**
- 브라우저(실제 카카오 키)로 확인: 도로를 따라 굽어지는 실제 경로선, 장소 클릭 시 정확히 "50m" 눈금까지 확대되는 것, 버스 관련 UI/데이터가 전부 사라진 것까지 확인

**완료 (2026-09-04, 지출/사진 입력 UI 다듬기 + 오른쪽 패널 토글)**
- `ExpenseButton`의 지출 추가 폼: 처음엔 금액 입력을 2줄로 뺐다가, 사용자 피드백으로 다시 한 줄(카테고리 select — 금액 input — 추가 버튼)로 되돌리고 금액 input에 `flex-1`을 줘서 select와 버튼 사이 남는 공간을 전부 채우도록 함
- `TripWorkspace`의 오른쪽 패널(타임라인/비용/사진을 담은 380px `aside`)을 숨기고 펼 수 있는 토글 버튼 추가 — 패널과 지도 사이 경계에 붙어있다가 숨기면 화면 오른쪽 끝으로 이동, `translate-x-full`로 슬라이드 처리. 지도가 이미 `absolute inset-0`로 전체 화면을 채우고 있어서 패널을 숨기면 자동으로 지도만 꽉 차게 보임
- 타임라인 카드의 사진 추가를 전체화면 모달 대신 비용 입력과 같은 인라인 확장 패널로 변경: `PlacePhotos`(모달, 사진탭 전용으로 남김)에서 타임라인용 로직을 `PlacePhotosInline`으로 분리하고, 사진 버튼(📷)을 카드 하단이 아니라 상단 줄의 삭제 버튼 왼쪽으로 옮김 — 열림 상태는 `SortablePlaceRow`가 들고 버튼과 인라인 패널에 나눠서 내려줌
- 브라우저로 토글 열기/닫기, 지출/사진 인라인 패널이 서로 독립적으로 여닫히는 것, 사진탭(모달)은 그대로인 것까지 확인

**완료 (2026-09-04, 사진 라이트박스)**
- 사진 개수 제한은 원래 없었음(파일당 8MB, jpg/png/webp/gif만) — 사용자 질문에 답하며 확인
- 새 `PhotoLightbox` 컴포넌트: 사진 클릭 시 어두운 배경 위에 크게 띄우고 ‹/› 버튼과 방향키(←/→)로 넘기기, `n / 총개수` 표시, ✕ 또는 배경 클릭·Esc로 닫기
- 타임라인 인라인 패널(`PlacePhotosInline`)과 사진탭 모달(`PlacePhotos`) 양쪽 썸네일 클릭에 전부 연결 — 삭제 버튼은 별도 클릭 영역이라 라이트박스가 뜨지 않고 그대로 동작
- 실제로 사진 3장을 추가해서 라이트박스 열기 → 다음 사진으로 넘기기("1/3" → "2/3") → 닫기까지 브라우저로 확인

**완료 (2026-09-04, 사진 카운트 버그 + 라이트박스가 오른쪽 패널에 갇히던 문제)**
- `PlacePhotos`/`PlacePhotosInline`이 업로드·삭제 후 `router.refresh()`를 안 불러서, 방금 올린 사진 수가 타임라인 카드 상단의 📷 카운트 배지(부모 `PlaceList`가 받는 `place.photos` prop 기준)에는 반영이 안 되던 버그 수정 — 실사용자가 4장을 올렸는데 배지엔 3으로 남아있던 걸 재현·수정
- **버그**: `PhotoLightbox`가 `position: fixed`인데도 화면 전체가 아니라 오른쪽 380px 패널 안에서만 뜨고 있었음. 원인은 `TripWorkspace`의 `aside`에 붙인 슬라이드 토글용 `translate-x-*`(CSS `transform`)가 `fixed` 자손의 기준점을 뷰포트가 아니라 그 `aside` 자신으로 바꿔버리는 CSS 스펙 동작 때문(transform이 걸린 조상은 fixed 자손의 containing block이 됨) — `PhotoLightbox`를 `createPortal`로 `document.body`에 직접 렌더링해서 그 조상을 완전히 우회하도록 수정
- 브라우저로 카운트 배지가 실시간으로 정확히 반영되는 것, 라이트박스가 오른쪽 패널이 아니라 화면 전체 정가운데(왼쪽 지도 영역까지 어둡게 덮으며)에 뜨는 것까지 확인

**완료 (2026-09-04, 마커 클릭 시 장소 정보 카드)**
- `PlaceEntry.phone` 컬럼 추가 — 카카오 로컬 검색 응답의 `phone`을 그동안 안 받아오고 있었어서 `geocode.ts`에서 같이 추출하도록 수정. 장소검색으로 새로 추가하는 장소부터 전화번호가 저장됨(기존에 저장된 장소는 소급 적용 안 됨)
- `KakaoMapCanvas`: 마커 클릭 시 그 위치에 `kakao.maps.CustomOverlay`로 정보 카드를 띄움 — 이름/카테고리/주소/전화(있으면 `tel:` 링크)와 "카카오맵에서 보기"(place_url, 실제 리뷰·사진이 있는 카카오 플레이스 페이지로 새 탭 연결) · "네이버 지도"(장소명으로 네이버 지도 검색 URL 생성) 링크. 카드는 순수 DOM 엘리먼트로 만들어서 닫기 버튼에 직접 이벤트 리스너를 붙임(React JSX가 아니라 vanilla kakao.maps 레이어라 이 방식이 맞음)
- 리뷰/평점 자체는 카카오 공개 API가 제공하지 않아 우리 화면에 못 띄우고, 카카오/네이버 페이지로 링크 연결까지만 가능 — 사용자에게 미리 안내하고 진행
- 다른 마커를 클릭하거나 지도 배경을 클릭하면 기존 카드를 닫고 새로 뜨거나 그냥 닫히도록 처리
- 실제 카카오 키로 장소를 새로 검색·추가한 뒤 그 마커를 클릭해서 카드가 뜨는 것, 카카오맵/네이버 지도 링크가 실제 URL로 연결되는 것, 닫기 버튼 동작까지 브라우저로 확인

**완료 (2026-09-04, "AI로 일정 가져오기 갔다가 돌아오면 지도가 안 보임" 버그)**
- 원인: `next/script`의 `Script` 컴포넌트는 스크립트가 처음 로드될 때만 `onLoad`를 호출하고, 이미 로드된 스크립트를 가진 컴포넌트가 다시 마운트되면(이 앱에서는 여행 상세→AI 가져오기→다시 여행 상세로 돌아올 때 `KakaoMapCanvas`가 언마운트·재마운트됨) `onLoad`가 아니라 `onReady`만 호출한다 — Next.js `client/script.js` 소스의 주석에 "Second mount" 케이스로 명시되어 있음. 이 컴포넌트는 `onLoad`만 쓰고 있어서 재마운트 시 `sdkReady`가 계속 `false`로 남아 지도 초기화 코드가 아예 안 돌고 있었음
- `onReady` 콜백도 같이 등록하고, 추가 안전망으로 마운트 시 `window.kakao?.maps`가 이미 있으면 바로 `sdkReady`를 켜는 effect를 하나 더 추가
- 브라우저로 여행 상세 → AI 가져오기 → 뒤로가기를 두 번 반복해서 매번 지도(마커+실제 도로 경로선)가 정상적으로 다시 뜨는 것까지 확인

**완료 (2026-09-04, 정보 카드 내용 보강 + 대시보드 클릭에도 연결)**
- **카테고리 표시를 `category_group_name` → `category_name`으로 전환**: 카카오 로컬 키워드 검색의 `category_group_name`은 음식점/카페/병원 등 정해진 15개 대분류에만 채워지고 나머지는 빈 문자열이라, "강릉중앙시장" 같은 장소는 카테고리가 아예 안 뜨고 있었음. 항상 채워지는 `category_name`(전체 경로, 예: "가정,생활 > 시장")을 우선 사용하도록 `geocode.ts` 수정
- **주소를 지번+도로명 둘 다 표시**: 기존엔 `address`(지번) 하나만 카드에 보여주고 `roadAddress`(도로명)는 저장만 해두고 안 썼음. `TripWorkspace`/`ImportFlow`가 `KakaoMapCanvas`에 넘기는 포인트에 `roadAddress`를 별도 필드로 추가하고, 정보 카드에 "지번 ..."과 "도로명 ..." 두 줄로 표시
- **대시보드(타임라인/비용/사진)에서 장소를 클릭해도 정보 카드가 뜨도록 연결**: 기존엔 마커를 직접 클릭할 때만 정보 카드가 떴고, 대시보드 클릭은 지도 이동만 했음. `KakaoMapCanvas`의 마커 클릭 핸들러에 있던 카드 생성 로직을 컴포넌트 스코프의 `openInfoOverlay(pointId)` 함수로 빼내고(포인트 데이터를 들고 있는 `pointsRef` 신설), `selectedPlaceId`가 바뀌는 effect(대시보드 클릭 경로)에서도 이 함수를 그대로 호출하도록 수정
- 브라우저로 확인: 기존 장소(초당순두부마을, `category_name` 적용 전 데이터)는 이전 카테고리 값과 지번 주소만 뜨는 것으로 하위호환 확인, 이번에 새로 검색해서 추가한 "강릉중앙시장"은 전체 카테고리 경로("가정,생활 > 시장")와 지번·도로명 주소가 모두 뜨는 것, 타임라인에서 이름을 클릭하면 지도 이동과 동시에 정보 카드가 뜨는 것까지 확인
- **카카오 로컬 키워드 검색 API가 주는 정보 중 아직 화면에 안 쓰는 것**: `id`(카카오 자체 장소 ID), `category_group_code`(대분류 코드, 이름과 1:1 대응이라 안 씀), `distance`(반경 검색 시에만 채워짐, 우리는 키워드 검색만 써서 항상 빈 값). 반대로 카카오 공개 API가 아예 제공하지 않는 정보: 평점/리뷰/영업시간/대표사진 — 이건 `place_url`로 실제 카카오 플레이스 페이지를 새 탭으로 열어야만 사람이 볼 수 있음(이전 세션에 이미 안내함)

**완료 (2026-09-04, 비용 탭 장소별 세부 지출 + 타임라인 지출 메모 입력)**
- **비용 탭 "장소별 지출" 클릭 시 세부 내역 아코디언으로 펼쳐 보기**: `ExpenseSummary`가 그동안 `{id,name,total}`만 받아서 장소당 합계만 보여줬는데, 실제 `Expense[]`(카테고리·금액·메모)를 함께 받도록 `PlaceTotal` 타입을 확장하고, 행 클릭 시 지도 이동은 그대로 두면서 그 아래에 항목별 목록(카테고리 뱃지 + 메모 + 금액)을 펼치는 로컬 아코디언 상태(`expandedId`)를 추가함. 데이터 자체는 이미 `getTrip`이 `include: { expenses: true }`로 다 가져오고 있어서 서버/스키마 변경 없이 화면단 배선만 필요했음
- **타임라인 지출 입력 폼에 "무엇에 지출했는지" 메모 입력칸 추가**: 폼 구성을 기존 [카테고리 select] → [금액] → [추가]에서 [카테고리 select] → [메모 텍스트 입력] → [금액] → [추가]로 변경. `Expense.memo` 컬럼과 `createExpenseSchema`의 `memo` 필드, `addPlaceExpense`의 `memo` 파라미터는 Phase 4 때 이미 만들어져 있었는데 그동안 실제로 입력받는 UI가 없어서 항상 비어있었음 — 이번에 `ExpenseButton`에 실제로 값을 채워 보내도록 연결. 입력된 메모는 타임라인 카드의 지출 목록과 비용 탭의 세부 내역 양쪽에 카테고리 뱃지 옆 텍스트로 함께 표시
- `tsc --noEmit`, `eslint` 통과 확인. 브라우저로 확인: 비용 탭에서 "경포호수" 클릭 → 기타 32,000원/교통 15,000원 세부 내역이 펼쳐지는 것, 타임라인에서 "안목해변"에 카테고리=음식/메모="커피"/금액=4,500원을 입력해 추가하니 카드에 "음식 커피 4,500원"으로 바로 표시되는 것까지 확인

**완료 (2026-09-04, 타임라인 지출 목록·입력 폼 컬럼 정렬)**
- 사용자 피드백: 카테고리/메모/금액이 뒤죽박죽 붙어있던 지출 목록을 아래 입력 폼의 각 칸(카테고리 select — 메모 입력 — 금액 입력 — 버튼)에 정확히 맞춰 표 형태로 정렬해달라는 요청
- `ExpenseButton.tsx`의 지출 목록(`<li>`)과 입력 폼(`<form>`)이 같은 4개 컬럼 너비를 공유하도록 통일: 카테고리 `w-16`, 메모 `flex-1`, 금액 `w-16`(우측 정렬), 삭제/추가 버튼 `w-10`. 처음엔 삭제 버튼(작은 텍스트)과 추가 버튼(패딩 있는 버튼)의 너비가 서로 달라서 `flex-1`인 메모 칸이 두 행에서 다른 너비로 계산되고, 그 결과 금액 칸이 미세하게 어긋나는 문제가 있었음 — 버튼 칸까지 고정 너비로 맞추고서야 완전히 정렬됨(브라우저에서 각 요소의 `getBoundingClientRect()`로 좌우 좌표까지 직접 대조해 확인)
- 브라우저로 카테고리 2글자(음식)와 3글자(입장권) 두 경우 모두 컬럼이 어긋나지 않는 것까지 확인

**완료 (2026-09-04, 지출 금액 줄바꿈 방지 + 카테고리 가운데정렬)**
- **금액이 천만원 단위(8자리) 이상이면 "원"이 다음 줄로 넘어가던 문제 수정**: 금액 컬럼이 `w-16`(64px) 고정 폭이라 "10,000,000원"처럼 길어지면 콤마 뒤에서 줄바꿈이 일어났음. 컬럼 폭을 `w-24`(96px)로 늘리고 `whitespace-nowrap`을 추가해 한 줄로 고정 — 입력 폼의 금액 입력칸도 같은 폭으로 맞춰서 목록/폼 정렬이 계속 맞도록 함
- **카테고리 컬럼 가운데정렬**: 지출 목록의 카테고리 뱃지와 입력 폼의 카테고리 select 둘 다 `text-center`로 변경
- 브라우저로 "숙소/호텔 1박/10,000,000원"을 실제로 추가해 한 줄에 다 표시되는 것, `getClientRects().length === 1`로 실제 줄바꿈이 없는 것, 금액 컬럼이 폭 변경 후에도 입력 폼과 좌우 좌표까지 정확히 맞는 것까지 확인

**완료 (2026-09-04, 타임라인을 1일차/2일차 단위 아코디언으로 세분화)**
- 사용자 요청: 타임라인의 장소 목록을 하루 단위로 나눠서, "1일차" 섹션을 클릭하면 그 아래로 등록된 장소와 장소 등록(검색) UI가 나오게 해달라는 요청
- **날짜 계산**: `PlaceList.tsx`에 `getTripDays(startDate, endDate)`를 추가해 여행 시작일~종료일까지의 날짜 배열을 만듦(당일치기면 1일). 기존에 스키마에는 있었지만 UI에서 전혀 쓰이지 않던 `PlaceEntry.scheduledAt`을 이제 실제로 활용 — 장소의 `scheduledAt` 날짜가 여행의 N번째 날과 같으면 그 날 섹션에 배정, 없거나 여행 기간 밖이면 1일차로 폴백
- **아코디언 UI**: 날짜별로 "1일차 · 9/12(토)" 형태의 헤더 버튼을 만들어 클릭 시 펼침/접힘. 기본값은 장소가 하나라도 있는 날(+ 항상 1일차)은 펼침, 빈 날은 접힘 — 기존 4개 장소가 전부 `scheduledAt` 없이 저장돼 있던 걸 1일차로 자연스럽게 보여주면서, 새 여행일수가 늘어나도 화면이 어지럽지 않도록 함
- **날짜별 장소 등록**: 기존에 목록 위에 하나만 있던 `PlaceForm`(장소 검색) 검색창을 각 날짜 아코디언 안으로 이동시키고 `scheduledAt` prop을 추가 — 특정 날짜 섹션에서 검색해 추가하면 그 장소에 해당 날짜가 `scheduledAt`으로 저장됨(API/검증 스키마엔 이미 있던 필드라 백엔드 변경 없이 프런트만 연결)
- **날짜별 드래그 순서변경**: 기존엔 트립 전체를 하나의 `DndContext`로 묶어 정렬했는데, 이제 날짜마다 별도의 `DndContext`(`place-day-{tripId}-{dayIndex}`)를 둬서 같은 날 안에서만 순서를 바꿀 수 있게 함. 순서 저장 방식이 핵심: 그 날짜 그룹이 원래 갖고 있던 `order` 값들의 집합을 그대로 새 배치에 재할당(예: 1일차가 order 1,2,3을 쓰고 있었다면 재배열 후에도 그 세 값만 자리를 바꿔 쓰고, 2일차의 4,5는 건드리지 않음) — 그래서 날짜 간 경계를 흐트러뜨리지 않고 같은 날 안에서만 안전하게 재정렬됨
- **날짜 간 연결(이동경로) 유지**: 하루 안에서는 다음 장소, 그 날의 마지막 장소는 (비어있지 않은) 다음 날짜의 첫 장소로 자동 연결 — 화면에 표시되는 순서(날짜별로 묶은 뒤 그 안에서 `order` 정렬)를 기준으로 다음 장소를 계산해서, 예를 들어 1일차 마지막 "강릉중앙시장"에서 2일차 첫 장소로 이동경로 선이 정상적으로 이어짐
- **번호 매기기**: 기존엔 트립 전체 기준 1~N으로 매기던 순번을 날짜별로 1부터 다시 매기도록 변경(예: 2일차 첫 장소는 "2"가 아니라 "1")
- `AI로 일정 가져오기`로 추가되는 장소는 이번 변경에서 `scheduledAt`을 설정하지 않으므로 계속 1일차로 배정됨 — 필요해지면 다음 세션에서 가져오기 화면에도 날짜 선택 UI를 붙일 수 있음
- `tsc --noEmit`, `eslint` 통과 확인. 브라우저로 확인: 기존 4개 장소가 전부 1일차에 그대로 보이는 것, 2일차 섹션 클릭 시 펼쳐지고 그 안에서 검색·추가한 "오죽헌"이 2일차에만 등록되며 1일차 마지막 장소와 이동경로로 연결되는 것, 1일차 안에서 드래그로 순서를 바꾸면 저장되고 새로고침 후에도 유지되는 것, 2일차 순서/연결에는 영향이 없는 것까지 확인

**완료 (2026-09-04, 지도 이동경로를 날짜별로 필터링 + 색상 구분)**
- 사용자 요청: 지도의 이동경로 선을 날짜별로 나눠서 1일차를 열면 1일차 것만, 2일차를 열면 2일차 것만 보이게 하고, 여러 날짜를 동시에 열면 서로 다른 색으로 구분해달라는 요청
- **날짜 유틸 공유화**: `PlaceList.tsx` 안에만 있던 `getTripDays`/`groupByDay`/`dayIndexForPlace`/`formatDayLabel`을 새 [days.ts](apps/web/src/app/trips/[tripId]/days.ts)로 뽑아내고, 날짜별 고정 색상 팔레트(`DAY_COLORS`/`dayColor`)를 추가 — `TripWorkspace`(지도)와 `PlaceList`(아코디언) 양쪽이 같은 로직/색상을 공유
- **아코디언 펼침 상태를 지도까지 끌어올림**: 그동안 `PlaceList` 내부에만 있던 `expandedDays` 상태를 `TripWorkspace`로 옮기고 `PlaceList`엔 `expandedDays`/`onToggleDay`로 props 전달 — 지도의 이동경로 계산이 "현재 펼쳐진 날짜가 뭔지"를 알아야 하기 때문
- **지도 세그먼트를 날짜별로 필터링 + 색상 부여**: `TripWorkspace`의 `segments` 계산을 "펼쳐진 날짜(`expandedDays`)의 장소 그룹만, 그 날짜 고유 색상(`dayColor(dayIndex)`)으로" 만들도록 변경. `KakaoMapCanvas`의 `MapSegment` 타입에 `color` 필드를 추가하고 `Polyline`의 `strokeColor`에 반영. 아코디언 헤더에도 같은 색 점을 넣어 "이 색 = 이 날짜"를 바로 알아보게 함
- **버그 두 개 발견 및 수정** (이번 기능 작업 중 지도가 계속 세계지도로 확대된 채 멈추거나, 실제 도로 곡선 대신 마커를 직선으로 잇는 상태로 굳는 문제를 재현):
  1. 지도가 세계지도 수준으로 줌아웃된 채 멈추는 문제 — 카카오맵 SDK의 고질적 이슈로, 지도를 담을 컨테이너 div가 아직 완전히 레이아웃/페인트되지 않은 시점에 `new kakao.maps.Map()`을 생성하면 좌표 투영이 깨진 채로 굳어버림. `map.relayout()`을 추가하고, 지도 생성 직후 로직을 `requestAnimationFrame`으로 한 프레임 미뤄서 컨테이너 크기가 확정된 뒤에 마커 배치·범위 맞춤이 이뤄지도록 수정
  2. 이동경로가 실제 도로 곡선이 아니라 마커를 잇는 직선인 채로 계속 보이는 문제 — 원인은 두 가지가 겹쳐 있었음. (a) React StrictMode(개발 모드)가 effect를 마운트→클린업→재마운트로 두 번 실행하는데, 지도 생성 effect에 클린업이 없어서 먼저 만들어진 지도 인스턴스가 컨테이너에 남아있다가 나중 인스턴스와 겹칠 수 있었음 — effect에 클린업을 추가해 컨테이너를 완전히 비우고 상태를 리셋하도록 함. (b) 마커/이동경로선을 "기존 지도 위에서 폴리라인만 갈아끼우는" 방식으로 최적화했었는데, `setMap(null)`로 지우는 것과 새로 만드는 것이 카카오맵 내부 렌더링과 타이밍이 겹치면 옛 직선 경로가 화면에 남는 경우가 있어서, 장소·이동경로가 바뀔 때마다 지도를 통째로 새로 만드는 더 단순하고 검증된 방식으로 되돌림(관련해서 실제 API 응답의 도로 좌표 배열 자체는 항상 정상이었음을 네트워크 응답으로 직접 확인 — 렌더링 쪽 문제였음)
- `tsc --noEmit`, `eslint` 통과 확인(새로 생긴 경고 3개는 지도 정리 함수 안에서 ref의 "현재" 값을 그대로 쓰는 의도된 패턴이라 남겨둠). 브라우저로 여러 번 새로고침 반복 확인: 1일차만 펼쳤을 때 파란색 실제 도로 곡선만 보이는 것, 1일차를 접고 2일차를 펼치면 지도의 파란 선이 사라지고 2일차 장소만 남는 것, 1일차+2일차를 동시에 펼치면 파란색(1일차)과 주황색(2일차) 선이 동시에 실제 도로를 따라 표시되는 것, 여러 번의 새로고침에서 항상 도시 단위로 정확히 확대되고 직선으로 굳지 않는 것까지 확인

**완료 (2026-09-05, 드래그 순서변경 시 지도 즉시 반영 + 작은 화면 스크롤 버그)**
- **버그 1 (지도-타임라인 상태 불일치)**: 타임라인에서 장소 순서를 드래그로 바꿔도 지도의 이동경로 선이 그대로였음. 원인은 `PlaceList`가 낙관적 업데이트(삭제 실행취소·드래그 정렬)용 `items` 상태를 자체적으로 들고 있는데, `TripWorkspace`(지도 마커/경로 계산)는 서버에서 내려온 원본 `places` prop만 보고 있어서 지도와 타임라인이 서로 다른 데이터를 그리고 있었음(드래그 핸들러가 `router.refresh()`도 안 불러서 다른 액션으로 새로고침되기 전까지는 영원히 안 맞았음). 삭제/드래그 상태(`items`, `pendingDeletes`, `reorderTimers`, `handleDeletePlace`, `handleDragEndForDay`)를 전부 `TripWorkspace`로 끌어올려 지도(`points`/`groups`/`segments`)와 `PlaceList`가 같은 상태를 공유하도록 수정 — `PlaceList`는 그 상태와 핸들러를 props로 받기만 하는 얇은 컴포넌트가 됨
- **버그 2 (작은 화면 스크롤 불가)**: 화면 세로가 짧을 때 1일차·2일차에 장소가 많으면 3일차 이후를 볼 방법이 없었음(스크롤 자체가 안 생김). 원인은 `TripWorkspace`가 `PlaceList`/`PhotoGallery`를 감싸는 `<div className="min-h-0 flex-1">`는 flex 레이아웃으로 높이가 정확히 계산되지만, 그 안의 실제 `overflow-y-auto` div는 일반 블록 자식이라 부모의 계산된 높이를 상속받지 못하고 콘텐츠 전체 높이만큼 늘어나 버려(`scrollHeight === clientHeight`) 스크롤할 대상 자체가 없는 상태였음. `PlaceList`/`PhotoGallery`의 스크롤 루트 div에 `h-full`을 추가해 부모의 제한된 높이를 실제로 채우도록 수정
- 브라우저로 두 버그 모두 재현 후 수정 확인: (1) 드래그로 1·2번 순서를 바꾸자 지도 경로선이 즉시 새 순서로 다시 그려지는 것, PATCH로 서버에도 반영되어 새로고침 후에도 유지되는 것까지 확인. (2) 400×400처럼 작은 뷰포트에서 (수정 전엔 `clientHeight === scrollHeight`로 스크롤 불가였다가) 수정 후 실제로 잘려서(`clientHeight < scrollHeight`) 스크롤바가 생기고, 스크롤해서 이전엔 안 보이던 2일차까지 도달 가능한 것 확인(사진 탭도 같은 구조라 함께 수정)
- `tsc --noEmit` 통과 확인

**완료 (2026-09-05, 사진 탭도 타임라인처럼 일차별 아코디언으로 분리)**
- 사용자 요청: 사진 탭이 장소를 트립 전체 기준으로 한 줄에 쭉 나열하고 있어서, 타임라인 탭처럼 1일차/2일차 단위로 나누고 그 안의 장소 순서도 맞춰달라는 요청
- `PhotoGallery`를 `PlaceList`의 날짜 아코디언 구조와 동일하게 재작성: `days.ts`의 `getTripDays`/`groupByDay`/`formatDayLabel`/`dayColor`로 날짜별로 묶고, `PlaceList`에서 쓰던 `Chevron` 아이콘을 export해서 재사용(로직 복제 대신 공유). 펼침/접힘 상태(`expandedDays`/`onToggleDay`)는 `TripWorkspace`가 이미 들고 있던 것을 그대로 공유해서, 타임라인에서 펼쳐둔 날짜가 사진 탭에서도 그대로 펼쳐져 보이도록 함(지도의 이동경로 필터링과도 같은 상태를 씀)
- **장소 순서 버그도 같이 수정**: `TripWorkspace`가 `PhotoGallery`에 서버에서 내려온 원본 `places` prop을 넘기고 있었는데, 이건 지난 세션에 고친 드래그 정렬용 `items` 상태(낙관적 업데이트 반영본)가 아니라서 방금 순서를 바꿔도 사진 탭에는 옛 순서로 나올 수 있었음. `items`로 교체해서 세 탭(타임라인/비용/사진)이 전부 같은 정렬 상태를 보도록 통일
- `tsc --noEmit` 통과 확인. 브라우저로 확인: 사진 탭에 "1일차 · 9/12(토)" 헤더 아래 경포호수→안목해변→초당순두부마을→강릉중앙시장이 타임라인과 같은 순서로 나오는 것, "2일차 · 9/13(일)"을 펼치면 "등록된 장소가 없습니다" 표시, 사진 탭에서 펼친 날짜가 타임라인 탭으로 돌아가도 그대로 펼쳐져 있는 것까지 확인

**완료 (2026-09-06, 관리자 페이지 + 회원 정보 수정 + 닉네임 중복확인)**
- **관리자 페이지(`/admin`)**: `User.role`("USER"|"ADMIN") 필드와 `Notice` 모델 신규 추가. `/admin/layout.tsx`에서 로그인+관리자 여부를 확인해 아니면 `/trips`로 리다이렉트하고, `/api/admin/**` 라우트들도 각자 다시 한 번 관리자 여부를 확인(페이지 가드 우회 방지, 기존 소유권 검증 이중 체크 패턴과 동일). 회원관리(목록/권한 토글/삭제 — 본인 계정은 관리자 페이지에서 수정·삭제 불가하게 막아서 자기 자신을 강등·삭제하는 사고 방지)와 공지사항 CRUD 구현. 최초 관리자 계정은 가입 화면에 role 선택 자체를 두지 않고(권한상승 방지) DB에서 직접 `UPDATE`로 지정
- **회원 정보 수정 페이지(`/account`)**: 닉네임/비밀번호 변경(비밀번호는 현재 비밀번호 검증 후 변경). 대시보드 우측 상단에 "내 정보" 버튼(관리자는 "관리자" 버튼도 함께) 추가
- **닉네임 중복확인**: `User.nickname`에 유니크 제약 추가, 회원가입/내 정보 수정 화면 양쪽에 "중복확인" 버튼 + API(`/api/auth/nickname-check`는 전체 대상, `/api/account/nickname-check`는 본인 닉네임은 제외하고 검사) 추가. 저장 시에도 서비스 레이어에서 재검증 + DB 유니크 제약 위반(P2002)까지 방어해 동시 가입 레이스컨디션도 차단
- 이 환경은 비대화형 셸이라 `prisma migrate dev`가 "변경사항 확인" 프롬프트에 막혀 실행이 안 돼서, `prisma migrate diff`로 SQL을 뽑은 뒤 마이그레이션 폴더를 직접 만들고 `prisma migrate deploy`로 적용하는 방식을 이번 세션부터 사용(스키마 변경 3건: role/notice 추가, nickname 유니크, 아래 트립 공유 관련 필드)
- 브라우저로 관리자/비관리자 접근 차단(페이지 리다이렉트 + API 404 둘 다), 관리자 본인 계정 보호, 닉네임 중복확인 실제 성공/실패 케이스, 대시보드 버튼 노출까지 확인

**완료 (2026-09-07, 여행계획 공유하기)**
- **공유 켜기/끄기**: `Trip.isPublic`/`sharedAt` 필드 추가. 트립 상세 화면(`TripMetaEditor`)에 "공유하기" 토글 버튼과 공유 중일 때 공유 페이지 링크 노출
- **대시보드 탭 분리**: "내 여행계획"/"다른 사람 여행계획" 두 탭으로 분리(`TripsTabs`). 후자는 여행 이름 + 장소 이름/주소/도로명주소를 한 번에 매칭하는 자유 텍스트 검색(`listSharedTrips`)과 "더 보기" 페이지네이션 제공
- **공유 트립 읽기 전용 열람(`/trips/shared/[tripId]`)**: 지도·타임라인·비용·사진 전부 노출하되(사용자 요청), 드래그 정렬·삭제·업로드 같은 편집 컨트롤은 아예 없는 새 컴포넌트(`SharedPlaceList`/`SharedPhotoGrid`)로 작성해서 다른 사람 트립에 실수로/의도적으로 변경 요청을 보내는 일이 없도록 함. 지도 이동경로 조회(`getRoute`)도 기존엔 소유자만 허용했는데, 공개 트립이면 비소유자도 조회 가능하도록 완화(트립 소유권 검사에 `OR isPublic` 추가)
- **복사 기능**: 공개 트립만 복사 가능(`copyTrip`), 장소(이름/좌표/주소/카테고리/일정 등)만 복제하고 **사진·비용·경로 캐시는 제외** — 요청하신 대로 여행 일정 자체만 가져옴
- **지도 화면에서 바로 열람**: 트립 상세 지도 왼쪽 위 "← 내 여행계획" 버튼 옆에 "다른 사람 여행계획" 버튼을 추가, 클릭하면 지도 위에 팝업(`SharedTripsModal`)으로 검색+목록이 뜸(대시보드의 `SharedTripBrowser` 재사용)
- **버그 발견/수정 1**: `updateTripSchema`가 `createTripSchema.partial()`을 그대로 물려받고 있어서, "공유하기"처럼 `isPublic` 한 필드만 보내는 PATCH 요청에서도 zod가 `personnel` 필드의 `.default(1)`을 되살려 인원수를 실제로 1로 덮어써버리는 문제를 실제로 재현(3명 → 1명). `updateTripSchema`를 필드마다 명시적으로 optional인 스키마로 다시 작성해 근본 수정하고, 이미 손상된 실데이터도 원래 값으로 복구
- **버그 발견/수정 2**: 공유 목록 팝업의 검색 디바운스(300ms)가 최초 진입(검색어 없음) 시에도 그대로 걸려 있어서 팝업을 열 때마다 불필요하게 느리게 느껴지던 문제 — 최초 마운트는 디바운스 없이 즉시 조회하고, 이후 검색어를 입력할 때만 디바운스가 걸리도록 수정. 로딩 중 "불러오는 중..." 표시도 추가해 빈 화면으로 보이던 것도 개선
- **개선**: 트립 상세 진입 시 지도 이동경로가 실제 도로 경로 API 응답이 오기 전까지 장소를 잇는 직선으로 먼저 보였다가 곡선으로 바뀌던 것(의도된 폴백이었음) — 사용자 요청으로 경로가 로딩되기 전에는 아예 선을 그리지 않도록 `KakaoMapCanvas`에서 직선 폴백을 제거(내 트립/공유 트립 지도 둘 다 이 컴포넌트를 공유해서 함께 적용됨)
- 브라우저로 소유자 뷰(복사 버튼 대신 "내가 만든 여행입니다" 표시)/비소유자 뷰(복사 버튼 노출) 구분, 검색 매치·논매치, 비공개 트립 접근 차단(뷰 페이지 404 + 복사 API 404 둘 다), 복사한 트립의 비용이 0원으로 정상 제외된 것까지 확인

**완료 (2026-09-07, SNS 스타일 회원 프로필 + 회원검색)**
- **프로필 데이터**: `User.bio`/`avatarUrl` 필드 추가. `/account`(`AccountForm`)에 "프로필" 섹션 신설 — 아바타 업로드/삭제(기존 장소 사진 업로드와 동일한 검증 방식: jpg/png/webp/gif, 8MB. 단 1인 1장이라 새로 올리면 기존 파일을 자동 삭제·교체), 자기소개(300자) 저장. `lib/services/avatars.ts`를 `photos.ts`와 같은 패턴으로 신규 작성
- **회원검색 탭**(대시보드 "다른 사람 여행계획" 오른쪽에 추가): `UserSearchBrowser` — 검색어가 비어있으면 결과를 아예 노출하지 않고 "닉네임으로 검색해보세요" 안내만 표시(트위터/인스타그램 검색처럼 전체 회원 디렉토리를 그냥 다 보여주지 않는 방향, 사용자 확인 후 이 방식으로 결정). 결과는 아바타+닉네임+자기소개 한 줄+공유 여행 수 카드
- **회원 프로필 페이지(`/users/{닉네임}`)**: 닉네임을 URL로 사용(사용자 확인 후 결정 — 나중에 닉네임을 바꾸면 이전 링크가 깨지는 트레이드오프는 있음). 아바타/닉네임/자기소개/가입일/공유 중인 여행 수 헤더 + 그 아래 그 회원의 공개 여행 목록(더 보기 페이지네이션). **이메일·권한(role)은 검색·프로필 어디에도 노출하지 않음** — 공개 API(`/api/users/search`, `getPublicProfile`)가 처음부터 닉네임/자기소개/아바타/여행 수만 select
- 공유 여행 카드(`SharedTripBrowser`에 있던 `<li><Link>` 마크업)를 `SharedTripCard.tsx`로 뽑아 대시보드의 "다른 사람 여행계획" 탭과 프로필 페이지의 여행 목록 양쪽에서 공용으로 재사용
- **버그 발견/수정**: 회원검색 결과를 클릭해 프로필로 이동하면 계속 404가 떴음. 원인은 Next.js 16(Turbopack)의 `/users/[nickname]` 동적 라우트가 한글처럼 퍼센트 인코딩이 필요한 세그먼트 값을 **디코딩하지 않은 원본 문자열 그대로** `params.nickname`에 넘기고 있었기 때문(영문 닉네임은 인코딩이 없어서 우연히 안 드러났음) — DB 문자열의 유니코드 정규화(NFC/NFD) 문제인지부터 바이트 단위로 직접 대조해 배제한 뒤, 실제 원인을 서버 로그로 확인. `decodeURIComponent()`를 페이지 코드에서 직접 적용해 수정
- 브라우저+curl로 검색→프로필 이동, 아바타 실제 업로드(빨간 4×4 PNG)/삭제(디스크 파일까지 같이 삭제되는 것), 자기소개 저장 후 검색 결과·프로필 양쪽에 반영되는 것, 비로그인 시 검색 API 401·프로필 페이지 로그인 리다이렉트, 존재하지 않는 닉네임 404까지 확인. 테스트로 올렸던 아바타/자기소개는 실제 계정에서 정리함

**완료 (2026-09-07, 다른 사람 여행계획 목록에 프로필 사진 + 확대보기, 여행 만들기 폼 버튼 정렬)**
- **공유 여행 목록에 작성자 아바타 노출**: `listSharedTrips`가 내려주는 `user` select에 `avatarUrl`을 추가하고, `SharedTripCard`에 아바타를 표시 — 아바타 없는 회원은 기존처럼 닉네임 첫 글자 원형 플레이스홀더
- **아바타 클릭 시 확대보기**: 카드 전체가 `Link`이던 구조를 "아바타는 별도 버튼 + 나머지(이름/날짜/장소 수)만 `Link`"로 분리해서, 아바타를 눌러도 여행 상세로 안 넘어가고 그 자리에서 화면 가운데 크게 뜨는 `AvatarLightbox`(신규, 기존 사진 라이트박스와 같은 패턴 — 어두운 배경 + ✕/배경 클릭으로 닫기)가 열리도록 함. 대시보드 "다른 사람 여행계획" 탭과 회원 프로필 페이지의 여행 목록이 같은 `SharedTripCard`를 공유해서 둘 다 자동 적용됨
- **여행 만들기 폼 버튼 오른쪽 정렬**: `TripCreateForm`의 "취소"/"만들기" 버튼을 `justify-end`로 오른쪽 정렬하고 취소→만들기 순서로 배치(일반적인 다이얼로그 버튼 배치 관례)
- 브라우저로 아바타 있는/없는 카드 둘 다 확인, 아바타 클릭 시 확대 팝업이 뜨고 카드 나머지 영역 클릭 시엔 정상적으로 상세 페이지로 이동하는 것(닫기 후에도 정상 동작), 여행 만들기 폼 버튼 정렬까지 확인

**완료 (2026-09-07, 타임라인 일차 드래그 이동 + 트립 공유 범위 확장 + 프로필 여행목록 비공개)**

이 세션은 Docker가 실행되지 않는 환경(`docker compose up -d db` 불가, WSL 자체가 설치 안 되어 있어 Docker Desktop 엔진 구동 불가)이라, 코드 작성 시점엔 DB 없이 `tsc --noEmit`/`eslint`와 기존 코드 흐름 추적만으로 검증했다. 이후 **Docker 대신 Neon(무료 호스티드 Postgres)으로 전환**해서 `apps/web/.env`의 `DATABASE_URL`을 Neon 연결 문자열로 교체하고 `npx prisma migrate deploy`로 마이그레이션 12개를 전부 적용, 두 개의 테스트 계정(테스터A/테스터B)을 만들어 아래 3개 기능 전부 실제 브라우저/API 호출로 E2E 검증까지 완료했다(계정 전환은 UI 클릭 대신 `/api/auth/login`·각 API 라우트를 직접 fetch 호출하는 방식으로 빠르게 순회). **Docker 없이 개발하려면 앞으로도 `.env`의 `DATABASE_URL`을 이 Neon 인스턴스로 유지하면 된다** — `docker-compose.yml`/`up.sh`/`down.sh`는 이 세션에서는 안 씀(그대로 남겨둠, 나중에 Docker가 되는 환경으로 돌아가면 다시 쓸 수 있음).

- **AI 가져오기 날짜 문제 → 타임라인 드래그로 일차 이동 기능 신설**: 애초에 "가져오기 화면에 날짜 지정 UI를 넣자"는 방향이었으나, 사용자 피드백으로 "가져오기 화면은 그대로 두고, 대시보드에서 장소 순서 바꾸듯 드래그로 일차를 옮기게 하자"로 방향 전환. 날짜(아코디언)마다 따로 있던 `<DndContext>`([PlaceList.tsx](apps/web/src/app/trips/[tripId]/PlaceList.tsx))를 하나로 합쳐 dnd-kit의 멀티 컨테이너 드래그 패턴으로 재작성 — 날짜 컨테이너를 `useDroppable`로 등록해서 장소가 0개인 빈 날짜에도 드롭 가능하게 하고, `pointerWithin` → `closestCenter` 순으로 폴백하는 커스텀 충돌감지를 추가(빈 컨테이너에 `closestCenter` 단독으로는 드롭이 잘 안 잡히는 dnd-kit 알려진 이슈 회피). [TripWorkspace.tsx](apps/web/src/app/trips/[tripId]/TripWorkspace.tsx)의 `handleDragEndForDay`를 단일 `handleDragEnd`로 교체해 같은 날짜 안 재정렬은 기존 로직 그대로, 다른 날짜로 이동 시엔 이동한 장소에만 새 order 값(`max(order)+1`)을 부여하고 `scheduledAt`을 목적지 날짜로 갱신해서 PATCH. `createPlaceSchema`/`updatePlaceSchema`가 이미 `scheduledAt`을 받고 있어 API/스키마 변경은 불필요했음. `ImportFlow.tsx`/`aiParse.ts`는 건드리지 않음.
- **트립 공유 범위 확장(전체 공개 / 링크 전용 / 특정 회원 지정)**: `Trip.isPublic`(불리언)을 `Trip.visibility`(`"PRIVATE"|"UNLISTED"|"PUBLIC"`, `User.role`과 같은 문자열 컨벤션)로 교체하고, 오너가 특정 회원을 지정해 공유할 수 있는 `TripShare`(tripId+userId 유니크) 모델 신설. `getSharedTrip`/`getRoute`는 `PUBLIC`·`UNLISTED`·`TripShare` 매치·소유자 중 하나면 열람 허용, `listSharedTrips`(공개 목록/검색)는 `PUBLIC`만, `copyTrip`(복사)은 `PUBLIC`·`UNLISTED`만 허용(특정 회원 지정 공유는 더 사적인 공유로 보고 열람만, 복사는 막음). [TripMetaEditor.tsx](apps/web/src/app/trips/[tripId]/TripMetaEditor.tsx)의 단일 "공유하기" 토글을 3단 세그먼트(비공개/링크 공개/전체 공개) 버튼으로, 그 아래 새 [TripShareManager.tsx](apps/web/src/app/trips/[tripId]/TripShareManager.tsx)로 닉네임 검색+추가/제거 UI 추가(공개범위와 무관하게 항상 동작, PRIVATE 상태에서도 특정 회원 지정 가능). 대시보드에 "나에게 공유됨" 탭 신설([SharedWithMeBrowser.tsx](apps/web/src/app/trips/SharedWithMeBrowser.tsx)). 마이그레이션은 이 환경이 비대화형 셸이라 `prisma migrate diff` 대신 기존 전례(컬럼 추가/삭제 손 작성)를 따라 SQL을 직접 작성(`20260907120000_add_trip_visibility_and_shares`)
  - **마이그레이션 버그 발견/수정**: Neon에 처음 적용하다가 `DROP INDEX "trips_isPublic_sharedAt_idx"`가 "index does not exist"로 실패 — `ALTER TABLE ... DROP COLUMN "isPublic"`이 그 컬럼을 포함한 인덱스를 Postgres가 자동으로 먼저 지워버려서(CASCADE), 뒤이은 명시적 DROP INDEX가 중복이었음. 어떤 DB에도 성공 적용된 적 없는 마이그레이션이라 새 파일 대신 기존 파일에서 그 줄을 제거해 수정, `prisma migrate resolve --rolled-back` 후 재적용해서 정상 완료 확인
  - **브라우저 E2E 확인 (테스터A/테스터B 두 계정으로 교차 검증)**: PUBLIC 설정 시 다른 계정의 "다른 사람 여행계획" 목록에 노출·소유자 전용 API는 여전히 404 확인 → UNLISTED로 바꾸면 그 목록에선 빠지지만 직접 링크(`/trips/shared/[id]`)는 200, 복사도 가능 → PRIVATE로 바꾸고 닉네임으로 특정 회원(테스터B) 지정 공유하면 그 회원의 "나에게 공유됨" 탭에만 뜨고 일반 목록엔 안 뜨며, 복사는 404로 막힘 → 공유 제거(DELETE) 즉시 상대방의 접근이 404로 차단되는 것까지 확인
- **프로필의 "여행 목록" 노출만 별도로 비공개 설정**: 사용자가 명확히 확정한 범위대로 — 회원검색 노출, `/users/[nickname]` 프로필 페이지 열람(닉네임/자기소개/아바타)은 그대로 전체 공개 유지하고, **여행 목록 섹션만** 토글로 숨김. `User.showTripsOnProfile`(기본 `true`) 추가. `/users/[nickname]/page.tsx`는 본인이거나 이 값이 켜져 있을 때만 여행 목록/개수를 보여주고, 꺼져 있으면 "여행 목록을 비공개로 설정했습니다" 안내문만 표시. `AccountForm.tsx`의 자기소개 저장 폼에 체크박스 하나 추가해 같은 PATCH로 저장. **`listSharedTrips`에 특정 회원(`userId`) 필터가 걸릴 때도 그 회원의 `showTripsOnProfile`을 서비스 레이어에서 재확인**하도록 해서, 프로필 페이지의 첫 렌더뿐 아니라 `UserTripList`의 "더보기" 페이지네이션이 호출하는 `/api/trips/shared?userId=...`를 직접 두드려도 새어나가지 않게 막음. 마이그레이션 `20260907130000_add_user_show_trips_on_profile`(컬럼 추가만이라 문제 없이 적용됨)
  - **브라우저 E2E 확인**: 테스터B가 토글을 끄자 테스터A 입장에서 테스터B 검색·프로필 페이지 접속(200)·닉네임 노출은 그대로인데 여행목록 카드·개수만 안내문으로 대체되는 것, 우려했던 우회 경로인 `/api/trips/shared?userId=<B의 id>` 직접 호출도 빈 배열로 막히는 것, 테스터B 본인은 자기 프로필에서 여전히 목록이 보이는 것(자기 자신 예외)까지 확인
- **타임라인 일차 드래그 이동 브라우저 확인**: 2박 3일 트립에서 1일차에 넣은 장소를 dnd-kit 포인터 이벤트를 직접 dispatch해(자동화 도구의 `left_click_drag`이 dnd-kit의 포인터 센서를 못 잡아 타임아웃 나서, `pointerdown`→여러 단계 `pointermove`→`pointerup`을 스크립트로 재현) 2일차 드롭존으로 옮기자 dnd-kit 자체 접근성 안내("dropped over droppable area day-container-1")까지 뜨며 즉시 이동, 새로고침 후에도 2일차에 남아있는 것(서버 PATCH로 scheduledAt까지 저장됨) 확인
- `npx prisma generate`/`npx next typegen`이 세션 시작 시 둘 다 갱신 안 된 상태였음(README에 이미 있는 주의사항) — 재실행해서 해결, 이후 `tsc --noEmit` 전체 통과 확인.

**완료 (2026-09-07, shadcn/ui 도입 + 공유 UI 개선 + 버그 3건 수정)**

- **shadcn/ui 도입**: `docs/DESIGN_SYSTEM.md`가 처음부터 목표로 명시했지만 미도입 상태였던 shadcn/ui(Radix 기반)를 실제로 세팅. `npx shadcn@latest init -b radix -p nova -y`로 초기화(`components.json`, `src/lib/utils.ts`, `globals.css` 테마 변수), `button`/`input`/`select`/`label` 4개만 설치. 사용자가 맥/윈도우 간 비용입력·사진추가 영역 CSS가 다르게 보인다고 지적한 게 계기 — `<select>`/`<input type=file>` 같은 네이티브 폼 요소가 OS별로 다르게 렌더링되는 문제라 shadcn으로 교체하면 해결된다고 판단
  - **버그 발견/수정**: shadcn init이 `globals.css`를 덮어쓰며 기존 Geist 폰트 연결(`--font-sans: var(--font-geist-sans)`)을 `--font-sans: var(--font-sans)`(자기 자신 참조, 사실상 미정의)로 끊어놨음 — 그대로 뒀으면 사이트 전체 폰트가 조용히 깨졌을 것. 원래대로 복구
  - `docs/DESIGN_SYSTEM.md`의 목표 팔레트(`primary #2F6FED`, `danger #DC2626`)를 shadcn `--primary`/`--destructive` 변수에 적용 — 새로 만드는 shadcn 컴포넌트에만 적용되고 기존 `blue-600` 등 다른 화면은 안 건드림(전면 마이그레이션은 별도 작업)
  - [ExpenseButton.tsx](apps/web/src/app/trips/[tripId]/ExpenseButton.tsx)/[PlacePhotosInline.tsx](apps/web/src/app/trips/[tripId]/PlacePhotosInline.tsx)의 select/input/button을 shadcn 컴포넌트로 교체하면서 기존 픽셀 단위 열 정렬(w-16/w-24/w-10 등)은 `className`으로 그대로 유지 — 실제 지출 추가/삭제로 4열 정렬이 좌표 단위까지 안 틀어지는 것 확인
  - **사용자 재검수로 발견된 버그 2건 추가 수정**: (1) select/input이 `bg-transparent`라 패널 배경이 비쳐 사진 드롭존과 미묘하게 다르게 보이던 것 — 네 요소 모두 `bg-background`(순백)로 명시해 통일. (2) 지출 목록 행(카테고리 10px/메모·금액 12px/삭제 10px로 제각각이던, 사실 shadcn 이전부터 있던 값)을 콤보박스 기준 11px로 통일
- **트립 공유 UI 개선**: `TripShareManager.tsx`에서 "닉네임 정확히 입력→추가" 방식 대신 `/api/users/search`를 재사용한 실시간 검색+클릭 추가 UI로 교체했다가, 사용자 피드백으로 한 번 더 정리 — 별도 입력창/추가버튼 없애고 "공유 대상" 라벨 옆에 검색 입력창+"검색" 버튼 한 줄로 축약. 공유 페이지 링크는 새 [ShareLinkModal.tsx](apps/web/src/app/trips/[tripId]/ShareLinkModal.tsx) 팝업(URL 표시+복사 버튼, 클립보드 API 실패 시 텍스트 자동 선택 폴백)으로 교체, 공개범위 세그먼트 순서를 비공개/전체공개/공유로 바꾸고 "링크 공개"를 "공유"로 개명, 그 버튼을 누르면 상태 전환과 동시에 팝업이 뜨도록 통합
  - **버그 발견/수정(재발)**: `ShareLinkModal`이 처음엔 `TripWorkspace`의 사이드바(`aside`) 안에 중첩 렌더링되고 있었는데, 그 사이드바에 걸린 슬라이드용 CSS `transform`이 `position: fixed` 자손의 기준점을 뷰포트가 아니라 그 `aside` 자신으로 바꿔버려서 팝업이 화면 가운데가 아니라 사이드바 안에 갇혀 보였음 — `PhotoLightbox`에서 이미 한 번 겪고 고쳤던 것과 동일한 원인. 같은 해법(`createPortal`로 `document.body`에 직접 렌더링)을 적용해 해결
- **`up.sh`/`down.sh`의 실제 프로세스 종료 실패 버그 발견/수정**: PowerShell에서 `.\up.sh`를 실행하면 "앱 선택" 창이 뜨는 문제(`.sh` 확장자를 Windows가 실행 파일로 인식 못 함 — Git Bash를 통해 실행해야 함을 안내)를 처리하다가, `down.sh`가 실제로는 서버를 못 내리고 있다는 걸 발견. 원인: Git Bash에서 `nohup npm run dev &` 뒤의 `$!`가 MSYS 내부 PID라 실제 Windows PID와 안 맞아서(`tasklist`로 확인하면 존재하지 않는 PID) `kill`/`taskkill` 모두 엉뚱한 대상을 향하고 있었음. `netstat -ano`로 포트 3000을 실제 점유 중인 프로세스를 찾아 `taskkill /T /F`(자식 프로세스까지)로 종료하는 방식으로 교체, `up.sh` → `curl 200` → `down.sh` → `curl 연결거부` 두 번 연속 재현 확인. `up.sh`도 Docker 유무를 `DATABASE_URL`(localhost 여부)로 자동 판단하도록 수정(Neon처럼 원격 DB면 Docker 단계 스킵)
- **"이동경로 NaN분/NaNkm" 버그 조사 — 코드가 아니라 서버 재시작 문제였음**: 사용자가 캡처를 보내 지적. 재현해보니 라우트 계산 로직 자체는 정상(직접 스크립트로 호출하면 성공)인데 실제 떠 있던 dev 서버(HTTP)로는 새 경로 쌍마다 500이 남 — 이 세션 중 여러 번 `prisma generate`/스키마 마이그레이션을 하는 동안 그 서버 프로세스가 재시작 안 된 채 계속 떠 있어서 오래된 Prisma Client를 붙들고 있었던 것. `.next` 캐시 삭제 + 서버 재시작으로 동일 요청이 정상 200이 되는 것까지 확인 — README에 이미 있던 "스키마 변경 후 재시작 필요" 주의사항이 이번에도 재현된 사례
- 위 전체 `tsc --noEmit`/`eslint` 통과(기존에 있던 무관한 경고 15개 외 신규 없음), 실제 브라우저(테스터A/B 계정)로 검색→공유 추가/제거, 팝업 열기/복사/닫기까지 확인. 다만 ShareLinkModal의 화면 정중앙 정렬은 마지막에 브라우저 패널이 숨김 상태라 스크린샷으로 최종 확인은 못 하고 구조적 수정(portal 대상이 `document.body`인 것)만 확인함 — PhotoLightbox와 동일 패턴이라 신뢰도는 높지만, 다음에 화면 보이면 한 번 더 확인 권장

**완료 (2026-09-07, 공유 UI 재배치 + 동행자 등록 + 후기 탭 + 이동경로 NaN/500 버그 수정)**

- **공유 버튼 위치 정리**: `TripMetaEditor`의 3단 세그먼트(비공개/전체공개/공유)에서 "공유"를 분리 — 비공개/전체공개 2단 토글만 남기고, "공유" 버튼은 우측 상단 "수정" 버튼 왼쪽으로 독립 배치. 클릭하면 여전히 `visibility`를 `UNLISTED`로 바꾸면서 [ShareLinkModal.tsx](apps/web/src/app/trips/[tripId]/ShareLinkModal.tsx)를 띄움
- **닉네임 공유 UI를 공유 팝업 안으로 통합**: 그동안 사이드바에 항상 노출돼 있던 [TripShareManager.tsx](apps/web/src/app/trips/[tripId]/TripShareManager.tsx)(닉네임 검색+추가/제거)를 `ShareLinkModal` 내부로 이동 — "공유" 버튼 한 번으로 링크 복사와 닉네임 지정 공유를 한 팝업에서 처리
- **여행 생성 시 동행자 등록**: `TripParticipant` 모델 신규(트립당 여러 명, 가입 회원은 `userId` 연결·미가입자는 이름만). [TripCreateForm.tsx](apps/web/src/app/trips/TripCreateForm.tsx)에 "함께할 사람" 입력을 추가해 닉네임 검색으로 가입 회원을 추가하거나(검색 결과 없으면 이름만으로 미가입자 등록) 여러 명을 등록 후 한 번에 여행을 생성 — 가입 회원으로 등록된 동행자는 생성 트랜잭션 안에서 `TripShare`도 함께 만들어져 바로 열람 권한을 가짐(공유 팝업 목록에도 즉시 노출)
- **공유 여행 검색에 닉네임 조건 추가**: `listSharedTrips`(다른 사람 여행계획 검색)의 OR 조건에 `user.nickname` 매칭을 추가 — 여행 이름/장소 이름·주소에 이어 작성자 닉네임으로도 검색 가능. 검색창 placeholder도 "지역, 장소, 여행 이름, 닉네임으로 검색"으로 갱신
- **후기 탭 신설**: `Review` 모델(placeEntryId+content, Photo와 동일한 구조) 추가. 사진 탭과 완전히 같은 로직(날짜별 아코디언 → 장소별 목록)으로 [ReviewGallery.tsx](apps/web/src/app/trips/[tripId]/ReviewGallery.tsx)/[PlaceReviews.tsx](apps/web/src/app/trips/[tripId]/PlaceReviews.tsx) 작성, 타임라인/비용/사진 옆에 "후기" 탭으로 노출. 마이그레이션 1건(`20260907150000_add_trip_participants_and_reviews`)에 `TripParticipant`/`Review` 두 테이블을 함께 추가
- 위 5개 항목 전부 `tsc --noEmit`/`eslint` 통과 확인 후 브라우저로 실제 계정(테스터A)으로 여행 생성(가입 회원+미가입자 동행자 등록) → 공유 팝업에서 `TripShare` 자동 반영 확인 → 후기 작성/삭제 → "다른 사람 여행계획"에서 닉네임 검색까지 E2E 확인. 테스트로 만든 여행/장소/후기는 확인 후 정리함
- **버그 발견/수정: 이동경로 "NaN분·NaNkm" + 서버 500**: 사용자 요청으로 등록된 장소의 이동선/거리/금액을 점검하다가 재현. 근본 원인은 두 가지가 겹쳐 있었음
  1. [routes.ts](apps/web/src/lib/services/routes.ts)의 `fetchCarRoute`가 카카오모빌리티 Directions API를 호출하는 `fetch()`를 try/catch 없이 그대로 두고 있어서, 이 환경에서 그 호출이 `TypeError: fetch failed`(원인: `self-signed certificate in certificate chain` — 로컬 백신/사내망의 TLS 검사로 추정, 코드 버그 아님)로 실패하면 예외가 그대로 API 라우트까지 전파되어 500을 반환하고 있었음
  2. [RouteSegmentRow.tsx](apps/web/src/app/trips/[tripId]/RouteSegmentRow.tsx)가 응답 HTTP 상태를 확인하지 않고 `res.json()` 결과를 무조건 유효한 데이터로 취급해서, 500 응답의 `{error: "..."}` 본문에서 존재하지 않는 `distanceM`/`durationSec`를 나눗셈해 "NaN분 · NaNkm"으로 표시하고 있었음
  - 수정: `routes.ts`/`geocode.ts`(동일한 사각지대가 있어 같이 처리) 양쪽에서 `fetch` 호출을 try/catch로 감싸 네트워크/TLS 실패도 "호출 실패"(`null` 반환)로 통일 처리. `RouteSegmentRow.tsx`는 `res.ok`와 `distanceM`/`durationSec` 존재 여부를 함께 확인해서 실패 시 "이동정보를 불러올 수 없음"으로만 표시하도록 수정(문구도 "교통 API 키 설정 필요"에서 일반화)
  - 실제 여행에 장소 2개를 등록해 재현(수정 전 NaN 노출 + 서버 500 로그 확인) → 수정 후 같은 요청이 200과 `null` 본문을 반환하고 화면엔 "이동정보를 불러올 수 없음"만 뜨는 것까지 확인. **다만 이 TLS 문제 자체(카카오모빌리티로 나가는 HTTPS가 이 로컬 환경에서 막혀 있는 것)는 코드로 고칠 수 있는 성격이 아니라 이번엔 안전한 폴백까지만 처리함** — 아래 "실서버 환경 확인" 참고

**실서버 환경 확인 (2026-09-07)**
- 이 리포에는 아직 실제 배포(Vercel/Docker prod/CI 등) 설정이 전혀 없음(`vercel.json`·`Dockerfile`·`.github/workflows` 전부 부재, `git log`에도 배포 관련 커밋 없음) — 즉 지금 단계에선 "실서버"가 별도로 존재하지 않고, 이 로컬 dev 서버(Neon DB에 붙어 있음)가 유일한 실행 환경이다
- 위에서 발견한 `self-signed certificate in certificate chain` 에러는 Node의 `fetch`가 외부 HTTPS(카카오모빌리티)로 나갈 때 인증서 체인에서 검증되지 않은 자체서명 인증서를 만났다는 뜻으로, 전형적으로 **로컬 백신(HTTPS 검사 기능)이나 사내망 프록시가 TLS를 가로채면서 자체 root CA로 재서명**할 때 발생한다 — Node가 그 프록시의 root CA를 신뢰하지 않아서 생기는 것이라 카카오 서버 문제도 아니고, 이번에 수정한 라우트 코드 문제도 아니다. 실제 클라우드 서버(Vercel 등)는 이런 로컬 네트워크 개입이 없는 게 일반적이라 같은 문제가 재현될 가능성은 낮지만, 이 리포에 배포 대상이 없어 **직접 실서버에 붙여서 확인은 못 했다**
- 나중에 실제로 배포하게 되면: 배포 환경에서 "이동정보를 불러올 수 없음"이 계속 뜨는지 확인 → 뜬다면 (a) `KAKAO_REST_API_KEY`가 배포 환경 변수에 설정됐는지, (b) 배포 플랫폼이 아웃바운드 HTTPS를 프록시/방화벽으로 가로채는 설정인지(사내 폐쇄망 서버 등이면 가능) 순서로 확인하면 됨. 일반적인 Vercel/Node 클라우드 배포라면 이 로컬 환경 특유의 TLS 가로채기가 없어서 정상적으로 실제 거리/시간/택시요금이 표시될 것으로 예상됨

**완료 (2026-09-07, 여행 생성 동행자 검색 UX 개선)**
- **검색 결과 클릭 한 번으로 추가**: [TripCreateForm.tsx](apps/web/src/app/trips/TripCreateForm.tsx)의 "함께할 사람" 검색 결과 행이 기존엔 오른쪽 끝의 작은 11px "추가" 텍스트 버튼만 클릭 대상이라 누르기 불편했음 — `<li>` 안 전체(아바타+닉네임 포함)를 하나의 버튼으로 바꿔서 행 어디를 클릭해도 바로 추가되도록 수정. 이미 추가된 회원은 버튼 자체가 `disabled` 처리되어 "추가됨"만 표시
- **가입 회원은 "공유인원"으로 명시 표시**: 추가된 동행자 칩 목록에서 미가입자만 "(미가입)"으로 구분 표시하고 가입 회원은 아무 표시가 없었음 — 가입 회원 칩엔 파란색 "(공유인원)"을 붙여서, 이 사람은 여행 생성과 동시에 실제 `TripShare` 열람 권한도 함께 받는다는 걸 화면에서 바로 알 수 있게 함(백엔드 동작 자체는 이전 세션에 이미 구현되어 있었고 이번엔 표시만 보강)
- `tsc --noEmit`/`eslint` 통과 확인 후 브라우저로 실제 계정(테스터A)으로 검색 → 행 클릭(닉네임 텍스트 부분)으로 "테스터B (공유인원)" 추가, 미가입 이름("홍길동") 입력 → "추가" 버튼으로 "(미가입)" 추가까지 확인. 여행 생성까지는 진행하지 않고 취소로 정리(DB에 데이터 남기지 않음)

**완료 (2026-09-07, 반복 UI 패턴 4건 공용 컴포넌트로 추출)**

사용자가 "JSX에 스타일 직접 작성 금지 + 컴포넌트별 `.css` 파일 분리" 방식의 전면 리팩토링을 제안했으나, 검토 결과 이 프로젝트는 처음부터 Tailwind+shadcn/ui로 설계되어(`globals.css` 1개 외 별도 CSS 자산이 없고 TSX 54개 파일이 전부 Tailwind 유틸리티 className, `style={{}}` 10곳도 전부 드래그 transform/도넛차트 등 런타임 계산값이라 정적 CSS로 뺄 수 없음) 그 방식은 적용 불가로 판단, 대신 실제 코드 중복을 grep으로 찾아 위험도 낮은 대안(공용 React 컴포넌트/shadcn Button 전환)으로 범위를 좁혀 진행했다.

- **날짜 아코디언 셸 공용화**: [PlaceList.tsx](apps/web/src/app/trips/[tripId]/PlaceList.tsx)/[PhotoGallery.tsx](apps/web/src/app/trips/[tripId]/PhotoGallery.tsx)/[ReviewGallery.tsx](apps/web/src/app/trips/[tripId]/ReviewGallery.tsx)/[SharedPlaceList.tsx](apps/web/src/app/trips/shared/[tripId]/SharedPlaceList.tsx)/[SharedPhotoGrid.tsx](apps/web/src/app/trips/shared/[tripId]/SharedPhotoGrid.tsx) 5곳에 거의 동일하게 반복되던 "테두리 박스 + Chevron/색점/날짜라벨/개수 헤더 버튼 + 펼침 콘텐츠" 구조를 새 [DayAccordionSection.tsx](apps/web/src/app/trips/[tripId]/DayAccordionSection.tsx)로 추출(날짜별 실제 내용은 `children`으로 유지해 각 화면 고유 마크업/스타일은 그대로 둠). 기존 `PlaceList.tsx`에 있던 `Chevron`도 이 파일로 옮기고 4곳의 import를 갱신
- **팝업(모달) 셸 공용화**: [ShareLinkModal.tsx](apps/web/src/app/trips/[tripId]/ShareLinkModal.tsx)/[SharedTripsModal.tsx](apps/web/src/app/trips/[tripId]/SharedTripsModal.tsx)/[PlacePhotos.tsx](apps/web/src/app/trips/[tripId]/PlacePhotos.tsx)의 "배경 오버레이 + 흰 카드 + 제목/닫기버튼 헤더"를 새 [Modal.tsx](apps/web/src/components/Modal.tsx)로 추출, `createPortal(..., document.body)`을 기본 내장해서 이전에 `PhotoLightbox`/`ShareLinkModal`에서 두 번 겪었던 "부모의 CSS transform이 fixed 팝업의 기준점을 바꿔 화면 가운데가 아니라 패널 안에 갇히는" 버그 클래스를 원천 차단(`SharedTripsModal`은 기존엔 portal 없이도 우연히 안전한 위치에서 렌더링되고 있었는데, 이제 항상 안전해짐)
- **어두운 배경 라이트박스 닫기 버튼 공용화**: `PhotoLightbox.tsx`/`AvatarLightbox.tsx`에 완전히 동일하게 있던 닫기 버튼을 새 [LightboxCloseButton.tsx](apps/web/src/components/LightboxCloseButton.tsx)로 추출(밝은 배경 Modal 헤더의 닫기 버튼과는 스타일이 달라 별도 컴포넌트로 분리)
- **기본/보조 버튼을 shadcn `Button`으로 전환**: TripCreateForm/TripMetaEditor/AccountForm/CopyTripButton/ImportFlow/register·login 페이지/admin 공지사항 목록·폼, 총 9개 파일의 원시 `<button className="rounded-md bg-blue-600...">`(기본)/`border border-neutral-300`(보조/취소) 버튼 20개를 `@/components/ui/button`의 `Button`(`variant="outline"`/`"default"`)으로 교체 — 지난 세션에 남겨뒀던 "shadcn은 비용입력/사진추가 두 곳에만 적용됨" 할 일을 마무리. 기존 padding/text 크기는 `className`으로 그대로 유지(`cn()`이 tailwind-merge 기반이라 뒤에 오는 className이 올바르게 우선 적용되는 것을 `ExpenseButton.tsx`의 기존 사용례로 먼저 확인). `admin/notices/page.tsx`의 `<Link>` 버튼은 `Button asChild`(Radix Slot)로 전환
- `tsc --noEmit` 전체 통과, `eslint` 검사 결과 새로 만든/수정한 파일에서는 0건(기존에 있던 무관한 경고·에러 15건은 이번 세션에서 손대지 않은 파일들로 그대로 남아있음 확인). 브라우저로 실제 계정(테스터A)으로 트립을 새로 만들어 날짜 아코디언(타임라인/사진/후기 탭 펼침·접힘), 공유 링크 팝업, "다른 사람 여행계획" 팝업, 사진 업로드 팝업이 전부 화면 정중앙에 정상 렌더링되는 것을 확인했고, 공개 전환 후 `/trips/shared/[id]`(SharedPlaceList/SharedPhotoGrid)도 동일하게 확인. 버튼 전환은 `/account`, `/login`, `/register`, 트립 생성/수정 폼에서 레이아웃 변화 없이 렌더링되는 것을 확인(단, `/admin/notices`는 관리자 계정이 없어 코드 검토 + 컴파일 통과로만 확인). 테스트로 만든 트립은 삭제해 정리함

**완료 (2026-09-07, 레거시 client/·server/ 디스크에서 삭제)**
- 그동안 `.gitignore`에만 넣고 "참고용"으로 디스크에 남겨뒀던 레거시 `client/`(CRA, 687M)·`server/`(Express, 42M)를 사용자 요청으로 완전히 삭제(`rm -rf`). git이 애초에 추적하지 않던 폴더라 `git status`/커밋 이력에는 영향 없음 — 삭제 전 `git status --porcelain`으로 미커밋 변경 없음을 확인 후 진행

**완료 (2026-09-07, globals.css "Can't resolve 'tw-animate-css'" 빌드 에러 수정)**
- 사용자가 로컬 dev 서버(`localhost:3000`)에서 `apps/web/src/app/globals.css`의 `CssSyntaxError: Can't resolve 'tw-animate-css'`로 빈 화면을 보고했음
- **원인 1(진짜 원인)**: `apps/web` 안에 별도 `package-lock.json`이 있었음(2026-09-03에 실수로 커밋된 것으로 추정). 이 프로젝트는 npm workspaces라 lock 파일은 루트 하나여야 하는데, Next.js 16 Turbopack이 "가장 가까운 lock 파일"로 프로젝트 루트를 자동 추론하면서 `apps/web`을 루트로 오인 → Turbopack이 프로젝트 루트 바깥은 resolve하지 않는다는 정책(`node_modules/next/dist/docs/.../turbopack.md` "Root directory" 항목) 때문에, 루트 `node_modules`에만 있던 `tw-animate-css`/`shadcn` 패키지를 전혀 찾지 못하고 있었음. `apps/web/package-lock.json`을 삭제해 해결(루트 `package-lock.json`이 이미 `apps/web`의 의존성을 전부 포함하므로 별도 lock 파일 자체가 불필요했음)
- **원인 2(수정 중 함께 발견)**: 원인 1을 고치려고 루트에서 `npm install`을 재실행했더니, README에 이미 있던 주의사항대로 Prisma Client가 재생성되지 않아 `trips.isPublic does not exist`(스키마엔 `visibility`로 이미 리네임된 상태) 500 에러가 새로 발생 — `npx prisma generate`로 해결
- **버그 발견(부수적)**: 사용자가 "서버 기동했다"고 한 dev 서버가 `up.sh`/`down.sh`의 PID 추적 밖에서 수동으로 떠 있던 프로세스(PID 52908)였어서, `./down.sh && ./up.sh`로는 실제로 재시작되지 않고 있었음(포트 3000을 점유한 좀비 프로세스에 계속 요청이 가고 있었음) — `kill`로 직접 정리 후 `up.sh`로 재기동해서야 수정사항이 반영됨. `up.sh`/`down.sh` 자체의 버그는 아니고, 스크립트 밖에서 뜬 서버는 추적할 방법이 없다는 한계
- 위 두 원인 모두 해결 후 `./down.sh && rm -rf apps/web/.next && ./up.sh`로 완전 재기동, 브라우저로 `/login` 화면이 CSS 정상 적용된 채(파란 로그인 버튼 등) 렌더링되는 것과 `.dev-server.log`에 `globals.css`/`isPublic` 관련 에러가 더 이상 없는 것까지 확인
- 재발 방지로 README "수동으로 띄우기" 섹션의 `npm install`을 `apps/web` 안이 아니라 루트에서 실행하도록 수정, "이 환경 관련 참고사항"에 이 lock 파일 문제 새 항목 추가

**완료 (2026-09-08, 후기 탭에 장소별 별점 추가)**
- 사용자 요청: 후기 탭의 장소 이름 오른쪽에 별 5개짜리 별점을 오른쪽 정렬로 추가, 클릭한 별까지 왼쪽부터 노란색으로 채워지는 방식
- `PlaceEntry.rating`(Int, 기본값 0, 0~5) 필드 추가(마이그레이션 `20260908090000_add_place_rating`). 후기(`Review`)는 장소당 여러 건이 달릴 수 있는 별개 개념이라, 별점은 후기 각각이 아니라 **장소 자체에 달린 값 하나**로 설계(리뷰 사이트의 "장소 평균 별점"이 아니라 이 트립 안에서 내가 매기는 개인 평점 개념)
- 새 [PlaceRating.tsx](apps/web/src/app/trips/[tripId]/PlaceRating.tsx): 별 5개 SVG를 순수 클라이언트 컴포넌트로 구현, `PATCH /api/trips/[tripId]/places/[placeId]`에 `{ rating }`만 보내 저장(기존 장소 수정 API/스키마 재사용, 별도 엔드포인트 신설 안 함). 클릭 즉시 낙관적으로 채워 보여주고 실패 시 이전 값으로 롤백, hover 시에도 그 지점까지 미리 채워 보이도록 함. [ReviewGallery.tsx](apps/web/src/app/trips/[tripId]/ReviewGallery.tsx)의 장소 이름 버튼을 `justify-between` flex 행으로 감싸 오른쪽에 배치
- `updatePlaceSchema`(`lib/validation.ts`)에 `rating: 0~5 정수 optional` 추가, `PlaceInput` 타입(`lib/services/places.ts`)과 `PlaceEntry` 타입(`app/trips/[tripId]/types.ts`)에도 반영 — `createPlaceSchema`(장소 생성)에는 넣지 않음, 별점은 항상 생성 후 수정으로만 매기는 값이라서
- **버그 재현(README에 이미 있던 패턴)**: 마이그레이션 적용 후 dev 서버를 재시작했는데도 `Unknown argument rating` 500 에러가 재현됨 — `./down.sh && ./up.sh`만으로는 `apps/web/.next` 캐시가 이전 Prisma Client 타입을 계속 참조해서였고, `rm -rf apps/web/.next`까지 하고서야 해소됨(다른 스키마 변경 세션들에서도 반복된 것과 동일한 원인이라 새로 배운 건 아님, 재확인 차원)
- `tsc --noEmit`/`eslint` 통과 확인. 브라우저로 테스트 계정 신규 가입 → 여행 생성 → "경복궁" 장소 추가 → 후기 탭에서 4번째 별 클릭 시 1~4번째만 노란색으로 채워지는 것, 새로고침 후에도 4점이 유지되는 것까지 확인. 테스트 여행은 삭제해 정리함(테스트 계정 자체는 로컬 Docker DB에만 남음, 실 서비스 데이터 아님)

**완료 (2026-09-08, 장소 클릭 시 확대 축척을 50m → 100m로 변경)**
- 사용자 요청으로 `KakaoMapCanvas.tsx`의 `SELECTED_PLACE_ZOOM_LEVEL`을 3(50m 축척)에서 4(100m 축척)로 변경 — 장소를 하나 클릭했을 때 기존보다 한 단계 덜 확대되어 주변이 조금 더 넓게 보임
- 이 값을 만졌던 작업 세션이 커밋 없이 로컬에만 남겨뒀던 것을 이전 세션에서 발견해 사용자에게 확인 요청했었고, 이번 요청으로 의도된 변경임이 확정됨. 다만 이 환경(자동화 브라우저 패널)에서는 레벨 3/4 양쪽 모두 축척 라벨이 "30m"로 표시돼(원래 레벨 3이 "50m"로 뜬다고 문서화됐던 것과도 다름 — 이 패널의 렌더링 환경이 실제 데스크톱 브라우저와 배율이 달라서로 추정) 이 패널로는 "100m" 표시를 직접 재확인하지 못했음. 사용자가 실제 브라우저에서 이미 확인한 값을 신뢰해 반영함 — 혹시 실제로도 "100m"가 아니라면 알려주시면 다른 레벨 값으로 다시 조정 가능
- `tsc --noEmit` 통과 확인(수정한 상수 한 줄 외 diff 없음). `eslint`는 이 파일에 원래 있던 경고 3개/에러 6개(effect 안 setState, ref cleanup 관련, 전부 이전 세션들에서 이미 알고 있던 것)만 그대로이고 새로 생긴 문제는 없음

**완료 (2026-09-08, 공유 여행계획 후기 탭 + 닉네임 공유 멤버 전체수정 권한 + 후기 작성자 닉네임)**

사용자 요청 3건을 하나의 작업으로 함께 처리(서로 연결된 변경이라 분리하지 않음): (1) "다른 사람 여행계획"(읽기 전용 공개 열람)에 후기 탭이 없던 것 추가, (2) 닉네임으로 공유(`TripShare`)한 멤버가 지금까지 열람만 가능했던 것을 전체 수정 가능하도록 변경, (3) 여러 명이 같은 여행에 후기를 남길 수 있게 되니 각 후기에 작성자 닉네임 표시.

- **`Review.authorId` 추가**: 마이그레이션(`20260908110000_...`)에서 컬럼 추가 → 기존 후기는 그 장소가 속한 여행의 소유자로 백필 → `NOT NULL` + FK 설정. `PlaceReviews`/`ReviewGallery`/새 `SharedReviewGallery`가 전부 `review.author.nickname`을 표시
- **공유받은 멤버의 전체 수정 권한**: `places.ts`/`expenses.ts`/`photos.ts`/`reviews.ts`/`aiImport.ts` 각각에 중복돼 있던 "오너 본인인지" 체크(`assertTripOwnership`/`assertPlaceOwnership`)를 새 [tripAccess.ts](apps/web/src/lib/services/tripAccess.ts)의 `assertTripEditAccess`/`assertPlaceEditAccess`로 통합 교체 — 오너 본인이거나 `TripShare`로 공유받은 회원이면 통과. `getTrip`(전체 편집 화면 조회)도 같은 조건으로 완화해서, 공유받은 멤버가 `/trips/[tripId]`(오너와 동일한 편집 화면)에 직접 들어올 수 있게 함. **다만 공개범위(비공개/전체공개) 변경과 공유 대상 추가/제거는 오너만 가능**하도록 `updateTrip`에 별도 가드(새 `ForbiddenError`/403)를 남겨둠 — "내용은 전부 고칠 수 있어도 누구에게 보여줄지는 오너만 결정한다"는 경계로 설계
- **UI**: `TripMetaEditor`가 `isOwner` prop을 받아 공유받은 멤버에게는 공유 버튼·공개범위 토글을 숨기고 대신 "OO님의 여행"으로 누구 것인지 표시(이름/날짜/인원수 수정 버튼은 그대로 노출). "나에게 공유됨" 탭의 `SharedTripCard`는 기존 읽기 전용 `/trips/shared/[id]`가 아니라 전체 편집 화면 `/trips/[id]`로 링크하도록 변경(`href` prop 추가) — "다른 사람 여행계획"(PUBLIC 공개 열람, 편집 권한 없음)과 프로필 페이지의 카드는 기존 읽기 전용 링크 그대로 유지
- **읽기 전용 공유 화면에 후기 탭 추가**: 새 [SharedReviewGallery.tsx](apps/web/src/app/trips/shared/[tripId]/SharedReviewGallery.tsx) — `PlaceRating.tsx`에서 별점 SVG를 `Star`/`StaticStars`(읽기 전용, 클릭 불가)로 분리해 재사용. `getSharedTrip`도 `reviews`에 작성자 닉네임을 함께 내려주도록 수정
- `tsc --noEmit`/`eslint` 전체 통과. 브라우저로 두 계정(A=별점테스터/B=공유테스터B)을 만들어 E2E 확인: A가 트립 생성 후 전체공개 + 후기 작성 → B가 "다른 사람 여행계획"에서 그 트립의 후기 탭(읽기 전용)에 A의 후기+닉네임+별점이 보이는 것 → A가 B를 닉네임으로 공유 추가 → B가 "나에게 공유됨"에서 클릭하면 (읽기전용이 아니라) 오너와 동일한 전체 편집 화면으로 들어가는 것, 공유/공개범위 버튼은 없고 "별점테스터님의 여행" 표시만 있는 것 → B가 직접 후기를 추가하니 "공유테스터B" 닉네임으로 저장되는 것 → A로 돌아와도 B의 후기가 정상적으로 함께 보이고 A의 공유/공개범위 컨트롤은 그대로 살아있는 것까지 확인. 테스트 트립은 삭제해 정리(테스트 계정 2개는 로컬 Docker DB에만 남음)

**완료 (2026-09-08, 마커 정보 팝업에 장소 별점 표시 + Prisma Client 재생성 누락 버그 수정)**

- 사용자 요청으로 지도 마커 클릭 시 뜨는 정보 팝업([KakaoMapCanvas.tsx](apps/web/src/components/map/KakaoMapCanvas.tsx)의 `buildInfoCard`)에서 장소명 옆에 노란 별 아이콘 + 별점 숫자를 표시하도록 추가. `PlaceEntry.rating`(0~5, 공유 편집자 전원이 공동으로 매기는 단일 값 — 개인별 평점을 모아 평균 내는 구조는 아님)을 `MapPoint.rating`으로 전달해 표시하며, 0점(미평가)일 때는 배지를 숨김
- `TripWorkspace.tsx`/`SharedTripView.tsx` 양쪽의 `points` 매핑에 `rating: p.rating` 추가해 편집 화면과 읽기전용 공유 화면 모두에 반영
- **버그 발견/수정**: 직전 세션(후기 작성자 표시 기능)에서 `Review.author` 관계를 스키마에 추가하고 마이그레이션까지 적용했지만 `npx prisma generate`를 실행하지 않아, dev 서버가 "Unknown field `author` for include statement on model `Review`" 런타임 에러를 냄(README에 이미 여러 번 기록된 "스키마 변경 후 dev 서버/클라이언트 재생성 누락" 패턴과 동일). dev 서버가 Prisma 엔진 dll을 잠그고 있어 `prisma generate`가 EPERM으로 실패하는 것까지 확인 → dev 서버 종료 후 재생성, `.next/dev` 캐시 삭제, 서버 재시작으로 해소
- `tsc --noEmit` 통과 확인. 서버 재시작 후 사용자 본인 브라우저 세션이 재연결되어 API 호출이 200으로 정상 처리되는 것을 서버 로그로 확인. 별점 배지 UI 자체는 이 환경의 자동화 브라우저 패널에 로그인 세션이 없어 직접 클릭해 스크린샷으로 확인하지는 못함 — 사용자 쪽에서 마커 클릭해 확인 권장

**다음 세션 할 일**
- Phase 0 잔여 작업: 유출됐던 카카오 키 재발급(재발급 후 신규 키로 각자 `.env` 갱신 필요) — 사용자 확인/조치 필요해 자동 진행하지 않음
- (참고, 지금 범위 아님) 나중에 대중교통을 다시 붙이고 싶으면 ODsay 키 발급 + 이번에 지운 코드 복원부터 시작
- (참고) 일차 드래그 이동은 펼쳐진 날짜끼리만 가능 — 접힌 날짜 헤더 자체를 드롭존으로 만들면(자동 펼침) 한 단계 더 편해질 수 있음
- (참고) 특정 회원 지정 공유(`TripShare`)로만 공유된(PRIVATE) 트립은 복사를 막아뒀는데, 필요해지면 완화 검토
- (신규) 이 환경의 `self-signed certificate in certificate chain` 문제로 카카오모빌리티 경로조회를 로컬에서 끝까지 실동작 검증하지 못함 — 이 백신/네트워크 설정을 우회할 수 있게 되거나 실제 배포 환경이 생기면 실제 거리/시간/택시요금 숫자가 정상 표시되는지 마지막으로 한 번 더 확인 필요
- (신규) 여행 생성 시 등록한 미가입 동행자(`TripParticipant`, `userId` 없음)는 현재 생성 화면에만 노출되고 트립 상세에는 별도로 보여주는 화면이 없음 — 필요해지면 공유 팝업이나 트립 정보 영역에 동행자 목록을 추가하는 것 검토
- (신규) `/admin/notices`의 shadcn Button 전환은 관리자 계정이 없어 브라우저로 최종 확인을 못 함 — 관리자 계정으로 한 번 확인 권장
- (신규) 나머지 화면(날짜 입력, 인원수 등 네이티브 `<input>`/`<select>`)도 shadcn으로 옮기면 일관성이 더 좋아지겠지만, 이번엔 "기본/보조 버튼"으로 범위를 좁혀 진행함 — 필요해지면 다음 단계로
