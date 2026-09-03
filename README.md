# plan-map

카카오맵 기반 여행 일정 관리 서비스. 장소를 검색/저장하고, 교통수단별 이동시간을 계산해 경로를 구성하며, AI가 여행 텍스트를 분석해 일정을 자동 생성해준다.

## 리팩토링 배경

기존 CRA + Express/Sequelize 구조에서 카카오 API 키 하드코딩(공개 커밋), 평문 비밀번호 저장, Redux 리듀서 내부 사이드이펙트, 지도 로직 3중 중복 등의 문제가 발견되어 아키텍처를 재설계한다. 기능 요구사항이 확장되면서(AI 자동생성, 사진첩 연동, 만보기) 웹 단독으로는 감당 안 되는 항목(사진첩 자동연동, 만보기/GPS)이 생겨, **모바일 전용 기능은 고도화 단계로 미루고 웹부터 작업**한다.

## 기능 요구사항

| # | 요구사항 | 비고 |
|---|---|---|
| F1 | 여행계획 생성/수정/삭제 | 웹 1차 |
| F2 | 지도 API로 장소 검색·저장 | 웹 1차 |
| F3 | 교통수단별(자동차/버스) 실시간 경로·소요시간 | 웹 1차 |
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
| 대중교통 경로(F3) | 카카오모빌리티(자동차) + ODsay/Tmap(버스·지하철) | 카카오는 자동차 경로만 공개 API 제공 (미착수) |
| 스토리지 | Supabase Storage 또는 R2 | 사진 업로드, 운영 부담 최소화 (미착수) |

## 데이터 모델 (초안)

```
User        — id, email, password_hash, nickname
Trip        — id, user_id, name, date_range, personnel
PlaceEntry  — id, trip_id, order, name, lat/lng, address, category, scheduled_time
RouteSegment— from_place_id, to_place_id, mode(car|bus|walk), distance, duration, fare
Expense     — id, place_entry_id, amount, memo, source(manual|card_auto)
Photo       — id, place_entry_id, storage_key, taken_at
AIParseJob  — id, trip_id, raw_text, parsed_json, status
```

## 로드맵

- [~] **Phase 0 — 긴급 보안 조치**: 새 코드는 시크릿을 전부 `.env`로 분리해 하드코딩 재발 방지 완료. **미완료(사용자 조치 필요): 카카오 API 키 재발급**, DB 비밀번호 변경, 기존 `client/`·`server/` 내 중첩 `.git` 정리
- [x] **Phase 1 — 웹 MVP**: F1·F5 완료, F2는 수동 좌표 입력까지(자동완성은 카카오 키 필요)
- [x] **Phase 2 — 경로/교통**: 코드·UI 완료, 실제 조회는 API 키 설정 후 활성화 (F3)
- [~] **Phase 3 — AI 자동생성**: 코드 완료, 커밋/푸시됨 — Claude API 파싱(구조화 출력) + 카카오 로컬 검색 지오코딩 매칭 + 사용자 확인 UI(`/trips/[tripId]/import`) (F4). 실제 동작은 `ANTHROPIC_API_KEY`/`KAKAO_REST_API_KEY` 설정 및 로컬 DB 구동 후 확인 필요 — **이 개발 환경은 Docker를 실행할 수 없어 브라우저 E2E 테스트가 구조적으로 불가능**(사용자 확인, 2026-09-03)
- [~] **Phase 4 — 비용/사진 기본형**: 코드 완료 (F6, F7 웹 범위) — Prisma 스키마(Expense/Photo)는 이미 마련됨, 마이그레이션도 기존에 포함되어 있어 추가 마이그레이션 불필요. Phase 3과 동일하게 이 환경에서는 브라우저 E2E 테스트 불가
- [ ] **Phase 5 (고도화) — 모바일 앱**: Expo 앱, 사진첩 자동연동, 만보기/GPS (F7 완성, F8) — **웹 우선 진행이라는 기존 결정에 따라 이번 자동 진행 범위에서 제외**
- [ ] **Phase 6 (장기) — 카드 자동연동**: 오픈뱅킹/코드에프 등 제휴 검토 (F6 고도화) — **실제 금융기관 제휴가 필요해 코드만으로는 완료 불가, 계정 생성 등 실제 사업자 절차는 사용자 본인이 진행해야 함**

현재 단계: **Phase 3·4 코드 완료** — 둘 다 이 환경에서 브라우저 검증을 못 해, Docker를 쓸 수 있는 환경(다른 PC 등)에서 최종 확인 필요

## ⚠️ 이 환경 관련 참고사항

- **Prisma 클라이언트가 최초 `npm install` 시 자동 생성되지 않는다** — npm의 `allow-scripts` 정책이 `@prisma/client`/`prisma`의 postinstall/preinstall 스크립트를 차단해서, 스키마 기반 타입이 생성되지 않은 빈 stub 클라이언트만 남는다. 증상: `trip.places` 등 Prisma 조회 결과가 `any`로 추론되며 `tsc`에서 관련 없어 보이는 implicit-any 에러가 다수 발생. **`npm install` 후에는 반드시 `cd apps/web && npx prisma generate`를 한 번 실행**해야 한다(이번 세션에서 실행 완료).
- **Next.js 16의 `LayoutProps` 등 전역 라우트 타입은 `next dev`/`next build`를 한 번도 안 돌리면 존재하지 않는다** — `npx next typegen`으로 미리 생성 가능(이번 세션에서 실행 완료). 그 전에는 `layout.tsx`의 `LayoutProps<"/">` 참조가 "Cannot find name" 에러로 뜨는데, 코드 버그가 아니라 타입 생성 누락임.
- **Docker Desktop이 이 환경에서 실행되지 않는다**(사용자 확인) — `docker-compose.yml`의 Postgres를 못 띄우므로, DB가 필요한 화면(로그인 제출, `/trips` 이후 전체)은 이 환경에서 브라우저로 검증할 수 없다. DB 없이도 렌더링되는 화면(`/login`, `/register` 등 인증 전 화면)은 dev 서버로 직접 확인 가능 — 아래 항목 참고.
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

**다음 세션 할 일 (Docker를 쓸 수 있는 환경에서)**
- Phase 3: 회원가입→여행 생성→`/trips/[tripId]/import`에서 텍스트 분석→후보 확인→일괄 추가까지 브라우저로 검증. `ANTHROPIC_API_KEY` 미설정 상태에서 503 에러 배너가 뜨는지도 함께 확인
- Phase 4: 비용 탭 인라인 입력→탭 전환 후 총액/도넛 차트 반영, 사진 업로드/삭제(드래그앤드롭 포함), 타임라인 카드의 지출·사진 인라인 표시까지 브라우저로 검증
- 카카오맵/장소검색 실 연동, 대중교통 실 연동: 각각 `NEXT_PUBLIC_KAKAO_JS_KEY`/`KAKAO_REST_API_KEY`, `ODSAY_API_KEY` 사용자 발급 필요
- Phase 0 잔여 작업: 카카오 키 재발급(사용자), 중첩 `.git` 정리 — 둘 다 사용자 확인/조치가 필요해 자동 진행하지 않음
