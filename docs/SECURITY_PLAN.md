# 보안 · 대량 요청 공격 방어 계획

DDoS, 계정/여행 대량 생성, 외부 API(AI·카카오) 비용 소진 공격에 대비한 설계. 2026-10-13 승인.
진행 상황은 맨 아래 "단계별 진행"에서 갱신한다. 외부 서비스 기능·요금은 바뀔 수 있으니 적용 시점에 공식 문서로 다시 확인할 것.

## 1. 현재 구조 (2026-10-13 확인)

| 항목 | 상태 |
|---|---|
| 백엔드 | Next.js 16 Route Handler (`apps/web/src/app/api/**`) — 별도 백엔드 없음 |
| 인증 | Better Auth 1.7 (이메일/비밀번호 + 구글·카카오·네이버). **이메일 인증 절차 없음** |
| 검증 | Zod 4, 대부분 필드에 길이 상한 있음 |
| DB | PostgreSQL + Prisma. 연결 풀 상한·쿼리 타임아웃 미설정 |
| Redis / React Query / 작업 큐 | 없음 (AI 파싱은 요청 안에서 동기 실행) |
| 프록시 | 없음(배포 전). 계획상 서울 서버 1대 + Cloudflare |
| 소유권 검증 | 있음 (`lib/services/tripAccess.ts`) |
| 업로드 | 8MB·형식 제한 있음. 형식은 클라이언트가 보낸 `file.type`만 확인 |
| 외부 API | 카카오 `fetch`, Groq 호출 모두 타임아웃 없음. Groq 응답 토큰 상한 없음 |
| SSE | 프로세스 메모리 구독 목록, 사용자당 연결 수 제한 없음 |

### 발견한 위험
1. **회원가입/로그인 무제한** — `/api/auth/register`, `/api/auth/login`은 서버에서 `auth.api.*`를 호출하는데, Better Auth 문서상 `auth.api` 직접 호출에는 Better Auth 요청 제한이 적용되지 않는다. 또 Better Auth 기본 경로(`/api/auth/sign-up/email`, `/sign-in/email`)가 `[...all]` 핸들러로 그대로 열려 있어, 우리 라우트의 닉네임 검사 등을 우회할 수 있다.
2. 업로드 형식 위조 가능 (`file.type`만 신뢰).
3. 요청 제한·사용량 상한·외부 API 예산·긴급 차단이 전혀 없음.

## 2. 설계 원칙
- **다중 기준 제한**: IP / 로그인 사용자 / 엔드포인트 / 계정 등급 / 서비스 전체 / 외부 API 일일 예산 / 동시 실행 수.
- **저장소**: Redis가 없으므로 **PostgreSQL 원자적 카운터**(`rate_limit_counters`, `INSERT … ON CONFLICT DO UPDATE … RETURNING`). 동시 요청·서버 재시작·다중 서버에서도 우회되지 않는다. DB 쓰기가 생기므로 쓰기/고비용 엔드포인트에만 적용하고 조회 API엔 걸지 않는다. Redis 도입 시 `lib/rateLimit.ts`만 교체.
- **동시 실행 수**(AI, SSE)는 프로세스 메모리 세마포어 — 서버 1대에서만 정확, 다중 서버 시 Redis로 이전.
- **IP**: `TRUST_PROXY`로 지정한 프록시 헤더만 신뢰(`cloudflare` → `cf-connecting-ip`, `nginx` → `x-real-ip`). 그 외 `x-forwarded-for` 등은 무시. 사용자 ID는 항상 세션에서 꺼내고 요청 본문 값은 신뢰하지 않는다.
- **초과 시** 429 + `Retry-After`(초).
- **카카오 API 결과는 캐시하지 않는다** — 카카오 운영정책상 Local/길찾기 결과 저장·캐시 금지(README 2026-10-06 항목 참고). 예산·타임아웃·회로 차단기만 적용.
- 새 라이브러리·인증 체계는 도입하지 않는다. 기존 API 경로·응답 형태 유지.

## 3. 정책 (초기값)

### 인증
| 규칙 | 한도 |
|---|---|
| 회원가입 / IP | 10분 5회, 하루 20회 |
| 회원가입 / 서비스 전체 | 1시간 200회 |
| 로그인 / IP | 10분 20회 |
| 로그인 / 이메일(해시) | 10분 10회 |
| Better Auth 자체 경로(소셜 로그인 등) | Better Auth 기본(10초 100회, DB 저장) |
| Better Auth `/sign-up/email`, `/sign-in/email` | **비활성화** — 우리 라우트로만 |

### 여행 생성 (3단계)
| 항목 | 일반 | 신규(가입 24시간 미만) |
|---|---|---|
| 여행 생성 | 분당 5 / 하루 30 | 하루 3 |
| 여행 복사 | 시간당 10 | 하루 2 |
| 보유 여행 | 300 | — |
| 여행당 장소 | 150 | — |
| 동시 생성 | 1 | 1 |
| 서비스 전체 생성 | 분당 300 (초과 시 경보 + 429) | |
- `Idempotency-Key` 헤더: `Trip(userId, idempotencyKey)` 유일 제약, 같은 키 재요청은 기존 여행 반환.

### AI 파싱 (2단계)
- `max_completion_tokens` 설정, 타임아웃 30초.
- 사용자: 시간당 10회, 하루 20,000 토큰, 동시 1. 서비스 전체 일일 토큰 예산 초과 시 AI만 503.

### 카카오 (2단계)
- 서비스 전체 일일 호출 예산: 콘솔 쿼터의 80% 경보, 95% 신규 호출 차단.
- 사용자: 장소검색 분당 60, 경로 분당 60.
- 타임아웃 5초, 재시도 0회, 연속 5회 실패 시 60초 회로 차단.

### 업로드 · SSE (4단계)
- 매직 바이트로 실제 형식 확인, 장소당 사진 30장, 사용자당 총 용량 상한.
- SSE 사용자당 동시 3개, 전체 상한.

### 긴급 차단 (5단계)
- `app_settings` 테이블 플래그: 회원가입 / AI 파싱 / 외부 지도·경로 API / 여행 생성·복사 / 사진 업로드.
- 서버 메모리 30초 캐시, `/admin`에서 토글(재시작 불필요). 쓰기 경로에서만 검사 → 조회는 유지.

## 4. 서버 앞단 (7단계, 배포 시)

### Cloudflare 무료 플랜에서 실제로 되는 것
- 요청 제한 규칙 **1개**(IP 기준, 10초 집계, 10초 차단) → `/api/auth/*`에 사용. 엔드포인트별·사용자별 제한은 앱에서.
- WAF 커스텀 규칙(제3자 자료 기준 5개 — 대시보드에서 확인) → 관리자 경로 추가 통제 등.
- Under Attack 모드(공격 중 수동 활성화, 최후 수단), Turnstile 무료(회원가입 6단계), 요청 본문 100MB 상한.

### 원 서버
- 방화벽: 80/443은 Cloudflare IP 대역만 허용(원 서버 IP 노출 우회 방지).
- nginx: 경로별 `limit_req` 존(auth / ai / write / default), `limit_conn`, `client_max_body_size 10m`, 일반 타임아웃 60초, `/api/messages/stream`만 버퍼링 끔 + 긴 타임아웃, `proxy_set_header X-Real-IP $remote_addr`(Cloudflare 뒤라면 `real_ip_header CF-Connecting-IP` + Cloudflare 대역 `set_real_ip_from`).
- 관리자 경로: 앱의 `isAdmin` 검사 + (선택) Cloudflare 규칙.

### DB
- `DATABASE_URL`에 `connection_limit`, `pool_timeout`. `ALTER ROLE … SET statement_timeout = '5s'`.
- 개수 조회용 인덱스 `Trip(userId, createdAt)`.

## 5. 감지 · 대응
- 구조화 로그: API별 요청 수, 429 비율, 가입 수, 여행 생성 수, AI 토큰, 카카오 호출 수, DB 지연, SSE 연결 수.
- 경보 기준·대응 절차는 `docs/SECURITY_RUNBOOK.md`(7단계에서 작성).
- 비밀키·토큰·이메일·비밀번호·IP 원문은 로그에 남기지 않는다(규칙 이름만, 필요하면 해시).

## 6. 테스트
- Node 내장 `node:test` + 이미 설치된 `jiti`(TS 실행)로 `npm test --workspace=web`. 새 라이브러리 없음.
- 대상: 단일 사용자 한도 초과, 다중 계정 서비스 전체 한도, 동시 요청 카운터 원자성, Idempotency 중복, 외부 API 타임아웃·회로 차단, 소유권 검증, 긴급 차단 중 조회.
- 외부 서비스에 실제 부하를 주는 테스트는 하지 않는다.

## 7. 단계별 진행

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 (P0) | 회원가입/로그인 제한, IP 함수, PG 카운터, 429 응답, Better Auth 설정(DB 저장·IP 헤더·기본 이메일 경로 비활성화) | **완료 (2026-10-13)** |
| 2 (P0) | AI·카카오 타임아웃, 예산, 회로 차단기, 동시 실행 수 | **완료 (2026-10-13)** |
| 3 (P1) | 여행 생성·복사·장소 제한, 총량 상한, Idempotency-Key | **완료 (2026-10-13)** |
| 4 (P1) | 업로드 매직 바이트·장수 상한, SSE 연결 상한 | **완료 (2026-10-13)** |
| 5 (P1) | 긴급 차단 플래그 + 관리자 토글 | 대기 |
| 6 (P2) | 회원가입 Turnstile | 대기 |
| 7 (배포 시) | Cloudflare·방화벽·nginx·DB 풀 + 운영 문서 | 대기 |

### 1단계 구현 메모
- 파일: `lib/clientIp.ts`(신뢰 프록시 헤더만, IPv6는 /64로 묶음), `lib/rateLimit.ts`(`enforceRateLimits`, `RATE_RULES`), `lib/http.ts`(`tooManyRequests`), `api/auth/{login,register}`, `lib/betterAuth.ts`, 마이그레이션 `20261013120000_add_rate_limits`(`rate_limits`, `rate_limit_counters`).
- 카운터 저장소(DB) 오류 시엔 통과시킨다(fail-open) — 제한 장애로 로그인 전체가 멈추지 않게.
- 로그인 이메일 기준 키는 sha256 해시로만 저장. 로그엔 규칙 이름만.
- **주의**: Better Auth `rateLimit.storage = "database"`는 시작할 때 Prisma 클라이언트에 `rateLimit` 모델이 있는지 검사해서, 없으면 **모든 로그인/가입이 500(SCHEMA_MISMATCH)** 이 된다. 배포 순서는 반드시 `prisma migrate deploy` + `prisma generate` → 새 코드 기동. 로컬 dev 서버도 이 커밋 이후 한 번 재시작 필요.

### 2단계 구현 메모
- 파일: `lib/externalGuard.ts`(회로 차단기, 동시 실행 수 — 메모리), `lib/services/kakaoClient.ts`(카카오 호출 단일 경로: 키 → 회로 → 일일 예산 → 5초 타임아웃, 재시도 없음), `lib/rateLimit.ts`(사용량 단위 카운트·한국 자정 기준 일일 창·`assertRateLimits`·`remainingBudget`/`addUsage`), `lib/errors.ts`(`RateLimitedError` → 429), `lib/services/{geocode,routes,aiParse,aiImport}.ts`, `api/places/search`, `PlaceForm.tsx`.
- **정책값 조정(계획 대비)**:
  - AI 사용자 일일 토큰 20,000 → **100,000**. 입력 최대 5,000자(~수천 토큰) + 응답 상한 8,000토큰(추론 모델이라 추론 토큰 포함)이라 20,000이면 하루 1~2회밖에 못 씀.
  - 경로 사용자 한도 분당 60 → **120**, 그리고 **카카오를 실제로 부를 때만** 센다(DB 캐시 적중은 안 셈). 초과 시 오류 대신 있던 값/없음으로 표시 — 여행 상세가 구간 수만큼 한 번에 요청하기 때문.
- 카카오 회로 차단: 네트워크 오류·타임아웃·5xx·429·401 등은 실패로 셈, 400(잘못된 요청)은 안 셈. 장소검색과 길찾기는 회로가 별개.
- 장소검색 일시 장애/예산 소진/요청 과다는 503·429 + 안내 문구(예전엔 모든 503을 "API 키 설정 필요"로 표시하던 것 수정).
- AI: Groq SDK 기본 자동 재시도(2회) 끔, 응답이 비거나 JSON이 깨지면 예전처럼 "GROQ_API_KEY 필요" 오류가 아니라 빈 결과("장소를 찾지 못했습니다")로.
- AI 동시 실행: 사용자당 1개(초과 시 429 "이전 분석 진행 중"), 서버 전체 `AI_MAX_CONCURRENCY`(기본 4, 초과 시 503).

### 3단계 구현 메모
- 파일: `lib/services/tripQuota.ts`(`assertCanCreateTrip`, `assertCanAddPlace`, `withTripWriteSlot`, `TRIP_LIMITS`), `lib/services/trips.ts`(`createTrip`/`copyTrip`가 회원 객체를 받음), `lib/services/places.ts`, `lib/http.ts`(`readJsonBody` 64KB → 413), `api/trips`, `api/trips/[tripId]/{copy,places}`, 화면(`TripCreateForm`, `AiPlanFlow`, `CopyTripButton`, `PlaceForm`).
- 마이그레이션 `20261013150000_add_trip_idempotency_key`: `trips.idempotencyKey`(nullable) + `(userId, idempotencyKey)` 유일, `(userId, createdAt)` 인덱스(기존 `userId` 단일 인덱스 대체).
- 검사 순서: 동시 생성 1개 → (키가 있으면) 같은 키 여행 조회 → 속도 한도 → 보유 수 → 생성. 같은 키 재요청은 **한도를 쓰지 않고** 기존 여행을 200으로 돌려준다(새로 만들면 201). 다른 서버에서 같은 키로 동시에 만들어 유일 제약에 걸리면 먼저 만든 쪽을 돌려준다.
- 같은 사용자의 동시 요청은 하나만 처리하고 나머지는 429(Retry-After 2초) — 화면 버튼은 처리 중 비활성화되므로 실사용 영향 없음.
- 복사: 공개/링크공개 여부를 먼저 확인(비공개면 한도를 쓰지 않고 404) 후 생성과 같은 동시 제한·보유 수·서비스 전체 생성량 적용.
- 장소 추가: 사용자 분당 60(계획의 30에서 상향 — AI 일정 저장이 장소 최대 30개를 연달아 추가), 여행당 150개(공유 편집자 포함).
- 지출·사진·메시지 등 나머지 쓰기 API의 속도 제한은 4단계(업로드)와 함께 검토.

### 4단계 구현 메모
- 업로드(`lib/upload.ts`): `file.type` 대신 **매직 바이트**로 jpg/png/gif/webp 판별, 저장 확장자도 실제 형식으로. HTML/SVG를 이미지로 속여 올려 `/uploads`(우리 도메인)에서 스크립트가 실행되는 것 차단. 프로필 사진(`avatars.ts`)도 같은 검사로 통일.
- 업로드 요청은 `readFormData`가 선언된 크기 9MB 초과면 본문을 읽기 전에 413(`formData()`가 본문 전체를 메모리에 올리므로).
- 업로드 한도(`lib/services/uploadQuota.ts`): 장소 사진·대표사진·프로필·메시지 사진 합산 10분 60장 + 하루 300MB(`UPLOAD_USER_DAILY_BYTES`). 저장 성공분만 용량에 더함. 장소당 사진 30장.
- **계획 대비**: "사용자당 총 용량 상한"은 사진 크기를 DB에 기록해야 해서 오브젝트 스토리지 이전 때 같이 도입 — 지금은 일일 용량으로 증가 속도를 묶음.
- 실시간 연결(SSE): 화면이 컴포넌트마다 연결을 따로 열어 **탭 하나에 최대 4개**였음 → `hooks/useMessageStream.ts`가 탭당 연결 1개를 공유하도록 변경. 서버(`lib/messageEvents.ts`)는 사용자당 5개(=탭 5개, 계획의 3에서 상향), 전체 `SSE_MAX_CONNECTIONS`(기본 2000). 초과 시 429/503이고, 브라우저 EventSource는 200 아닌 응답이면 재연결을 멈추므로 30초 뒤 직접 다시 연결.
- 그 밖의 쓰기 API 사용자 분당 한도: 지출 60, 후기 20, 팔로우 30, 좋아요 60, 공유 30, 메시지 60, 새 대화 20(계획표의 "메시지·팔로우·좋아요 30"에서 실사용 속도에 맞게 조정).

## 배포 시 필요한 환경변수
| 변수 | 값 | 설명 |
|---|---|---|
| `TRUST_PROXY` | `cloudflare` 또는 `nginx` | 클라이언트 IP를 읽을 헤더. **미설정이면 IP 기준 제한이 꺼진다**(서비스 전체·이메일·사용자 기준은 유지) |
| `KAKAO_LOCAL_DAILY_QUOTA` | 카카오 개발자 콘솔의 로컬 API 일일 쿼터 | 기본 100,000(임시값). 80% 경고 로그, 95%부터 신규 호출 차단 |
| `KAKAO_DIRECTIONS_DAILY_QUOTA` | 카카오모빌리티 콘솔의 길찾기 일일 쿼터 | 기본 10,000(임시값). 위와 같음 |
| `AI_DAILY_TOKEN_BUDGET` | 서비스 전체 하루 AI 토큰 | 기본 1,000,000. Groq 요금제/한도에 맞춰 설정 |
| `AI_USER_DAILY_TOKEN_LIMIT` | 사용자당 하루 AI 토큰 | 기본 100,000 |
| `AI_MAX_CONCURRENCY` | 서버 전체 동시 AI 분석 수 | 기본 4 |
| `UPLOAD_USER_DAILY_BYTES` | 사용자당 하루 업로드 용량(바이트) | 기본 314572800(300MB) |
| `SSE_MAX_CONNECTIONS` | 서버 전체 실시간 연결 수 | 기본 2000 |
