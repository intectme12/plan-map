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
packages/
  shared/   zod 스키마 / 공용 타입 (추후 모바일 클라이언트 추가 시 재사용)
```

모바일(Expo) 클라이언트는 F7 사진첩 자동연동, F8 만보기/GPS가 필요해지는 시점에 별도 앱으로 추가한다. 그전까지 web이 API 서버 역할까지 겸한다.

## 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 웹 프론트 + API | Next.js 14 (App Router) + TypeScript | SSR로 지도/편집 UI 빠른 로딩, Route Handler로 별도 백엔드 없이 API 겸용 |
| DB | PostgreSQL + Prisma | PostGIS로 추후 이동거리/경로 비교 등 지오 쿼리 확장 용이, 타입 자동 생성 |
| 서버 상태 관리 | TanStack Query | 기존 axios+useState 반복 패턴 제거 |
| 지도 | 카카오맵 JS SDK | 국내 POI 검색 품질, 기존 로직 재사용 |
| 인증 | bcrypt 해싱 + JWT(httpOnly 쿠키) | 평문 비밀번호/파일세션 문제 해결 |
| 검증 | zod | 요청 검증 + 타입 동시 확보 |
| AI 파싱(F4) | Claude API (tool use) | 비정형 텍스트 → 구조화 일정 JSON 추출 |
| 대중교통 경로(F3) | 카카오모빌리티(자동차) + ODsay/Tmap(버스·지하철) | 카카오는 자동차 경로만 공개 API 제공 |
| 스토리지 | Supabase Storage 또는 R2 | 사진 업로드, 운영 부담 최소화 |

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

- [ ] **Phase 0 — 긴급 보안 조치**: 카카오 API 키 재발급, DB 비밀번호 변경, 시크릿 `.env`화, 기존 client/server 내 중첩 `.git` 정리
- [ ] **Phase 1 — 웹 MVP**: Next.js + Prisma + Postgres 스캐폴딩, 로그인/Trip/PlaceEntry CRUD, 카카오맵 검색·저장 이식 (F1, F2, F5)
- [ ] **Phase 2 — 경로/교통**: 자동차 경로 서버 프록시 + 대중교통(ODsay/Tmap) 연동 (F3)
- [ ] **Phase 3 — AI 자동생성**: Claude 파싱 + 지오코딩 매칭 + 사용자 확인 UI (F4)
- [ ] **Phase 4 — 비용/사진 기본형**: 지출 수동입력, 사진 업로드 (F6, F7 웹 범위)
- [ ] **Phase 5 (고도화) — 모바일 앱**: Expo 앱, 사진첩 자동연동, 만보기/GPS (F7 완성, F8)
- [ ] **Phase 6 (장기) — 카드 자동연동**: 오픈뱅킹/코드에프 등 제휴 검토 (F6 고도화)

현재 단계: **Phase 0 착수 예정**
