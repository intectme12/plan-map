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
- [ ] **Phase 3 — AI 자동생성**: **사용자 요청으로 보류(2026-09-03) — 나중에 진행**. Claude 파싱 + 지오코딩 매칭 + 사용자 확인 UI (F4)
- [~] **Phase 4 — 비용/사진 기본형**: 진행 중 — Phase 3을 건너뛰고 먼저 진행 (F6, F7 웹 범위) — Prisma 스키마(Expense/Photo)는 이미 마련됨
- [ ] **Phase 5 (고도화) — 모바일 앱**: Expo 앱, 사진첩 자동연동, 만보기/GPS (F7 완성, F8) — **웹 우선 진행이라는 기존 결정에 따라 이번 자동 진행 범위에서 제외**
- [ ] **Phase 6 (장기) — 카드 자동연동**: 오픈뱅킹/코드에프 등 제휴 검토 (F6 고도화) — **실제 금융기관 제휴가 필요해 코드만으로는 완료 불가, 계정 생성 등 실제 사업자 절차는 사용자 본인이 진행해야 함**

현재 단계: **Phase 4 진행 중** (Phase 3은 사용자 요청으로 뒤로 미룸)

## 진행 상황

이 섹션은 매 작업 세션 후 갱신한다. 자동 진행 지시(2026-09-03)에 따라 Phase 5(모바일)·Phase 6(카드 연동)은 외부 계정/제휴가 필요해 제외했고, 이후 사용자가 Phase 3(AI 자동생성)을 나중으로 미루라고 해서 Phase 4를 먼저 진행한다.

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

**다음 세션 할 일**
- Phase 4: 지출 수동입력(장소 카드 인라인) + 사진 업로드(로컬 디스크 저장, S3/R2는 추후)
- Phase 3(AI 자동생성)은 보류 상태 — 재개 요청 시 Claude API 파싱 + 카카오 로컬 검색 지오코딩 + 확인 UI로 진행
- 카카오맵/장소검색 실 연동, 대중교통 실 연동: 각각 `NEXT_PUBLIC_KAKAO_JS_KEY`/`KAKAO_REST_API_KEY`, `ODSAY_API_KEY` 사용자 발급 필요
- Phase 0 잔여 작업: 카카오 키 재발급(사용자), 중첩 `.git` 정리 — 둘 다 사용자 확인/조치가 필요해 자동 진행하지 않음
