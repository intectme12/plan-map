# API

`/api` 하위 Route Handler(버전 프리픽스 없음). 아키텍처 배경은 [ARCHITECTURE.md](./ARCHITECTURE.md) 참고.

## 공통 규칙

- JSON, 별도 표기 없으면 요청/응답 바디는 camelCase.
- 인증: `Authorization` 헤더가 아니라 **httpOnly 쿠키 세션**(better-auth DB 세션, [OAUTH.md](./OAUTH.md) 참고). 로그인 시 `Set-Cookie`로 발급, 이후 요청은 브라우저가 자동으로 쿠키를 붙임. 예외 없이 모든 트립/장소/지출/사진/경로/AI 엔드포인트가 이 방식으로 인증한다.
- 에러 응답: `{ "error": string | ZodFlattenedError }`. Zod 검증 실패는 400, 소유권 없음/미존재는 404, 외부 API 키 미설정처럼 기능 자체를 쓸 수 없는 경우는 503(`lib/http.ts`의 `handleRouteError`가 매핑).
- 소유권: 모든 변경 엔드포인트가 리소스를 로드해 `userId`를 검사한다. 실패 시 403이 아니라 404(리소스 존재 여부 자체를 감춤).

## 인증 (`/api/auth`)

`lib/betterAuth.ts`(better-auth) + `app/api/auth/*`. 아래 4개는 요청/응답 형태를 기존 그대로 유지한 자체 라우트, `[...all]`은 better-auth 내장 엔드포인트(OAuth 등)를 그대로 노출한다 — 자세한 내용은 [OAUTH.md](./OAUTH.md).

| Method | Path | 설명 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | `{ email, password, nickname }` → 계정 생성 + 세션 쿠키 발급 |
| `POST` | `/api/auth/login` | `{ email, password }` → 세션 쿠키 발급, `{ id, email, nickname }` 반환 |
| `POST` | `/api/auth/logout` | 세션 쿠키 삭제 |
| `GET` | `/api/auth/me` | 현재 로그인한 사용자 조회 |
| `POST` | `/api/auth/sign-in/social` | `{ provider: "kakao"\|"google"\|"naver", callbackURL }` → OAuth 인가 URL로 리다이렉트(better-auth 내장, `[...all]` 라우트가 처리) |
| `GET` | `/api/auth/callback/{kakao,google,naver}` | OAuth 콜백(better-auth 내장) |

## 여행 (`/api/trips`)

`lib/services/trips.ts`.

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/trips` | 내 여행 목록(장소 개수 포함) |
| `POST` | `/api/trips` | `{ name, startDate, endDate, personnel }` → 생성, `201` |
| `GET` | `/api/trips/{tripId}` | 여행 상세(장소 목록 포함) |
| `PATCH` | `/api/trips/{tripId}` | 부분 수정 |
| `DELETE` | `/api/trips/{tripId}` | 삭제 |

## 장소 검색 (`/api/places/search`)

`lib/services/geocode.ts`. 특정 여행에 종속되지 않는 순수 카카오 장소검색 프록시라 소유권 검사가 없다(로그인만 확인). [PlaceForm.tsx](../apps/web/src/app/trips/[tripId]/PlaceForm.tsx)가 300ms 디바운스로 호출해 검색어에 맞는 장소 후보를 드롭다운으로 보여주고, 클릭 한 번으로 `POST /api/trips/{tripId}/places`까지 이어서 호출한다(위도/경도 직접 입력 폐지, 2026-09-03).

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/places/search?q={검색어}` | `{ candidates: GeocodeCandidate[] }`. 2자 미만이면 빈 배열. `KAKAO_REST_API_KEY` 미설정 시 `503` |

## 장소 (`/api/trips/{tripId}/places`)

`lib/services/places.ts`. 항상 여행 소유권을 먼저 검사한 뒤 장소를 조회/수정한다.

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/trips/{tripId}/places` | 장소 목록(순서대로, 지출/사진 포함) |
| `POST` | `/api/trips/{tripId}/places` | `{ name, lat, lng, category?, address?, roadAddress?, placeUrl?, scheduledAt? }` → 생성(순서는 마지막+1로 자동 부여), `201` |
| `PATCH` | `/api/trips/{tripId}/places/{placeId}` | 부분 수정(`order`, `transportToNext` 포함) |
| `DELETE` | `/api/trips/{tripId}/places/{placeId}` | 삭제 |

## 경로 (`/api/trips/{tripId}/routes`)

`lib/services/routes.ts`. 카카오모빌리티(자동차)/ODsay(버스) 조회 결과를 `RouteSegment` 테이블에 10분 TTL로 캐싱. 자세한 폴백 동작은 [PUBLISHING.md](./PUBLISHING.md) 참고.

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/trips/{tripId}/routes?from={placeId}&to={placeId}&mode=car\|bus` | 소요시간/거리/요금(+ `mode=bus`일 때 `detail`에 지하철/버스 구간별 상세). API 키 미설정 시 `null` 반환(에러 아님) — 프런트는 "교통 API 키 설정 필요"로 표시 |

프런트(`RouteSegmentRow.tsx`)는 `car`/`bus` 두 모드를 항상 동시에 조회해서 나란히 보여준다(토글 아님) — 자차는 거리/시간, 택시는 카카오모빌리티가 같이 내려주는 예상 요금(`fareWon`), 대중교통은 ODsay 응답의 `subPath`를 파싱한 지하철/버스 구간별 상세(`detail`, 예: "2호선 강남역→교대역 3개역 → 402번 ...")까지 표시한다.

## AI 일정 자동생성 (`/api/trips/{tripId}/ai-parse`)

`lib/services/aiImport.ts`. 자세한 내용은 [AI.md](./AI.md).

| Method | Path | 설명 |
| --- | --- | --- |
| `POST` | `/api/trips/{tripId}/ai-parse` | `{ text: string(10~5000자) }` → `{ candidates: [{ name, category, note, candidates: GeocodeCandidate[] }] }`. `GROQ_API_KEY` 미설정 시 `503` |

후보를 실제 장소로 반영하는 별도 API는 없다 — 프런트가 사용자가 선택한 후보들을 기존 `POST /api/trips/{tripId}/places`로 순차 호출해 일괄 추가한다(주문(order) 충돌을 피하려고 병렬 호출하지 않음).

## 지출 (`/api/trips/{tripId}/places/{placeId}/expense`)

`lib/services/expenses.ts`. 장소 카드 인라인 입력에 맞춘 단순화 — 장소당 대표 지출 1건만 upsert한다(Expense 모델 자체는 장소당 여러 건을 허용하지만 UI가 다루는 건 1건뿐).

| Method | Path | 설명 |
| --- | --- | --- |
| `PATCH` | `/api/trips/{tripId}/places/{placeId}/expense` | `{ amount: number }` → 기존 지출이 있으면 갱신, 없으면 생성 |

## 사진 (`/api/trips/{tripId}/places/{placeId}/photos`)

`lib/services/photos.ts`. `public/uploads/{tripId}/{placeId}/`에 로컬 디스크 저장, `storageKey`를 public 상대경로로 저장해 별도 서빙 라우트 없이 `<img src>`로 바로 노출.

| Method | Path | 설명 |
| --- | --- | --- |
| `POST` | `/api/trips/{tripId}/places/{placeId}/photos` | `multipart/form-data`, `file` 필드. jpg/png/webp/gif만 허용, 8MB 제한. `201` |
| `DELETE` | `/api/trips/{tripId}/places/{placeId}/photos/{photoId}` | 삭제(DB 레코드 + 디스크 파일) |

## 후기 (`/api/trips/{tripId}/places/{placeId}/reviews`, `/api/reviews/{reviewId}`)

`lib/services/reviews.ts`. 카카오맵/네이버지도처럼 **실제 장소 단위로 전체공개**되는 후기 — `Review`는 `PlaceEntry`가 아니라 좌표(`lat`/`lng`)로 실제 장소를 식별하므로, 다른 트립에서 같은 장소를 추가한 사용자끼리도 서로의 후기를 본다. 작성한 트립의 공개설정(PRIVATE 포함)과 무관하게 항상 전체공개. 자세한 설계 이유는 [DATABASE.md](./DATABASE.md#후기review는-좌표-기반) 참고.

| Method | Path | 설명 |
| --- | --- | --- |
| `POST` | `/api/trips/{tripId}/places/{placeId}/reviews` | `{ rating: 1~5, content }`. 작성 자격 = 그 좌표의 장소를 자기 트립(오너 또는 공유받아 편집권한)에 추가해본 사람 — `assertPlaceEditAccess`로 증명. 좌표+작성자 기준 upsert라 이미 내 후기가 있으면 수정됨. `201` |
| `DELETE` | `/api/reviews/{reviewId}` | 본인이 작성한 후기만 삭제 가능(트립/장소 무관) — 아니면 `403` |

## 메시지 (`/api/conversations`, `/api/messages/stream`)

`lib/services/conversations.ts` + `lib/messageEvents.ts`. 1:1 DM(그룹채팅 없음). 자세한 설계는 [MESSAGING.md](./MESSAGING.md).

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/conversations` | 내 대화 목록(상대 정보/마지막 메시지 미리보기/안읽음 여부), `lastMessageAt desc` |
| `POST` | `/api/conversations` | `{ userId }` → 그 회원과의 대화를 조회하거나 없으면 생성, `201` |
| `GET` | `/api/conversations/{conversationId}/messages?before={ISO}` | 메시지 히스토리(최신 30개, `before`로 더 과거 페이지네이션 — 다른 목록과 달리 오프셋이 아니라 시각 커서를 쓰는 이유는 MESSAGING.md 참고) |
| `POST` | `/api/conversations/{conversationId}/messages` | `multipart/form-data`: `content`(선택)·`image`(선택, jpg/png/webp/gif 8MB 제한) — 최소 하나 필수. `201` |
| `POST` | `/api/conversations/{conversationId}/read` | 내 안읽음 상태 해제(`lastReadAt` 갱신) — 상대에게 `read` SSE 이벤트 발송(읽음 표시) |
| `POST` | `/api/conversations/{conversationId}/typing` | 입력 중 신호를 상대에게만 전달(DB 저장 안 함, `typing` SSE 이벤트) |
| `GET` | `/api/messages/stream` | SSE. 로그인 사용자당 연결 하나로 내가 속한 모든 대화의 새 메시지(`message`)/타이핑(`typing`)/읽음(`read`) 이벤트를 받는다 |

## 관련 문서

- [DATABASE.md](./DATABASE.md)
- [AI.md](./AI.md)
- [OAUTH.md](./OAUTH.md)
- [MESSAGING.md](./MESSAGING.md)
- [PUBLISHING.md](./PUBLISHING.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
