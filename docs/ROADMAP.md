# Roadmap

**상태:** 요약 표는 [README.md](../README.md)의 "로드맵"/"진행 상황"이 최신 상태를 유지한다 — 이 문서는 그걸 대체하지 않고, **단계별로 무엇을, 왜, 어떤 파일에 구현했는지** 조금 더 자세히 풀어 쓴 보조 문서다. 최신 현재 단계는 README를 우선 신뢰할 것(이 문서는 세션마다 자동 갱신되지 않을 수 있음).

## Phase 0 — 긴급 보안 조치 — 부분 완료

기존 CRA + Express 코드에서 카카오 API 키가 하드코딩되어 공개 커밋된 사고가 발견되어 시작. 새로 짠 코드는 시크릿을 전부 `apps/web/.env`로 분리(gitignore 처리) — 완료.

**미완료(사용자 본인 조치 필요, 자동 진행 범위 밖):**
- 유출된 카카오 API 키 재발급
- DB 비밀번호 변경
- 기존 `client/`·`server/`(구 CRA/Express) 안에 중첩된 `.git` 정리

## Phase 1 — 웹 MVP — 완료

- 모노레포(npm workspaces) + `apps/web`(Next.js 16 + TypeScript + Tailwind) 스캐폴딩.
- Postgres를 docker-compose로 로컬 구동(`localhost:55432`), Prisma 스키마(User/Trip/PlaceEntry/Expense/Photo) + 마이그레이션.
- 인증: 회원가입/로그인/로그아웃/me — bcrypt 해싱 + JWT httpOnly 쿠키(OAuth 아님, [OAUTH.md](./OAUTH.md) 참고).
- Trip·PlaceEntry CRUD API — 전 요청 소유권 검증 포함.
- 여행 리스트/상세 화면(지도 배경 + 오른쪽 타임라인 패널 레이아웃).
- 여행 정보 인라인 수정, 장소 드래그 순서변경(`@dnd-kit`, 500ms 디바운스 저장).
- 삭제는 전부 토스트 + 5초 실행취소 방식(`confirm()`/`alert()` 미사용).
- F1·F5 완료. F2(장소 검색)는 수동 좌표 입력까지만 — 카카오 자동완성은 키 설정 후 연결.

## Phase 2 — 경로/교통(F3) — 완료

- `RouteSegment` 모델 추가(출발지·도착지·수단별 캐시, 10분 TTL).
- 자동차 경로: 카카오모빌리티 Directions API 서버 프록시(`lib/services/routes.ts`).
- 대중교통(버스) 경로: ODsay API 연동.
- 두 경우 모두 키 미설정 시 에러 대신 "교통 API 키 설정 필요"로 안전하게 폴백 — 패턴 상세는 [PUBLISHING.md](./PUBLISHING.md).
- 타임라인에 장소 간 차/버스 토글 + 소요시간·거리·요금 표시.
- 발견/수정한 버그: `prisma migrate dev` 이후 dev 서버 재시작을 안 해서 `prisma.routeSegment` undefined 500 에러 발생 → 재현 후 "스키마 변경 후 dev 서버 재시작 필요"를 README에 명시.

## Phase 3 — AI 자동생성(F4) — 완료

한 세션에서 "나중에 진행"으로 보류됐다가, 이후 세션에서 재개 요청을 받아 완료.

- Claude API(`claude-opus-5`, 구조화 출력)로 텍스트에서 장소 추출 + 카카오 로컬 검색으로 지오코딩 매칭 — 상세는 [AI.md](./AI.md).
- 확인 UI(`/trips/[tripId]/import`): 텍스트 붙여넣기 → 스켈레톤 로딩 → 후보 카드 리스트(체크박스 기본 선택, 동명 장소는 뱃지+선택 드롭다운) + 지도 마커 → 일괄 추가.
- `AIParseJob` 같은 잡 큐 테이블은 만들지 않음(요청 1회로 끝나는 동기 흐름이라 불필요) — README 초안에서 조기 추상화로 판단해 뺌.
- 이 개발 환경에서 발견한 별개의 버그를 이 단계에서 같이 고침: `npm install`만으로는 Prisma 클라이언트가 실제로 생성되지 않아(`allow-scripts` 정책이 postinstall 차단) `tsc`가 무관해 보이는 implicit-any 에러를 냈던 것 — `npx prisma generate` + `npx next typegen`을 수동 실행해서 해결, README에 원인/해결법 기록.
- 이 환경은 Docker를 실행할 수 없어(사용자 확인) 브라우저 E2E 테스트는 못 함 — `tsc --noEmit` + `eslint`로만 검증.

## Phase 4 — 비용/사진 기본형(F6, F7 웹 범위) — 완료

- 장소 카드 인라인 지출 입력(금액만, blur 시 즉시저장·upsert) — `lib/services/expenses.ts`.
- 로컬 디스크 사진 업로드(`public/uploads/`, jpg/png/webp/gif, 8MB 제한) — `lib/services/photos.ts`. S3/R2는 운영 단계로 후순위.
- 여행 상세 화면에 `?tab=timeline|expense|photos` 탭 추가 — 비용 탭은 총액 + 카테고리별(장소의 `category` 필드 기준) 도넛 차트(CSS `conic-gradient`, 별도 차트 라이브러리 없이 구현), 사진 탭은 장소별 그룹 그리드.
- 업로드 모달은 Radix/shadcn 없이 직접 구현 — DESIGN.md는 shadcn/ui 도입을 명시했지만 아직 코드에 없어서 이번에 새로 끌어들이지 않음(도입 여부는 별도 결정 필요, [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) 참고).
- `Expense`에 카테고리 필드가 없어, 비용 탭의 카테고리 분류는 지출이 아니라 **장소(PlaceEntry)의 category**로 묶음(장소에 카테고리를 안 채우면 "기타"로 집계).
- Phase 3와 같은 이유로 브라우저 E2E는 미확인.

## Phase 5 (고도화) — 모바일 앱 — 착수 안 함

Expo 앱, 사진첩 자동연동(F7 완성), 만보기/GPS(F8). 웹 우선 진행이라는 기존 결정에 따라 자동 진행 범위에서 제외 — README "리팩토링 배경" 참고(모바일 전용 기능은 웹 단독으로 감당 안 되는 항목이라 고도화 단계로 미룸).

## Phase 6 (장기) — 카드 자동연동 — 착수 안 함

오픈뱅킹/코드에프 등 제휴 검토(F6 고도화). 실제 금융기관 제휴가 필요해 코드만으로는 완료 불가 — 계정 생성 등 실제 사업자 절차는 사용자 본인이 진행해야 한다.

## 명시적으로 순서를 벗어난 것들

- `packages/shared`(공용 타입/zod 스키마)는 아직 안 만든다 — 모바일(Expo) 앱이 실제로 생기기 전까지는 소비할 곳이 없는 조기 추상화라서 보류(README "아키텍처" 절 참고).
- TanStack Query 도입도 같은 이유로 보류 — 화면이 늘어나 캐싱/로딩상태 반복이 생기면 그때 도입.

## 관련 문서

- [README.md](../README.md) — 최신 상태 요약(우선 신뢰)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [AI.md](./AI.md)
