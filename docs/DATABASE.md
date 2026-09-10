# Database

**상태:** `apps/web/prisma/schema.prisma`가 실제 스키마 원본. 마이그레이션 2개 적용됨: `20260902151754_init`(User/Trip/PlaceEntry/Expense/Photo), `20260902223715_add_route_segments`(RouteSegment). PostgreSQL(Docker, `localhost:55432`)이 시스템 오브 레코드. 스키마 변경은 Prisma 마이그레이션 파일로 관리하고, **변경 후에는 dev 서버를 재시작해야 한다**(Phase 2에서 재시작 안 해 500 에러 낸 적 있음).

## 원칙

- 큐/워커가 없으므로 Redis 등 별도 저장소가 없다 — 캐시가 필요한 유일한 것(경로 조회)도 그냥 Postgres 테이블(`RouteSegment`)에 TTL 컬럼(`computedAt`)으로 구현.
- ID는 전부 `cuid()`(Prisma 기본), UUID 아님.
- 로그인(이메일/비밀번호 + 카카오/구글/네이버 OAuth)은 better-auth가 관장하고, `sessions`/`accounts`/`verifications` 테이블을 쓴다 — 자세한 내용은 [OAUTH.md](./OAUTH.md).
- 1:1 DM은 `conversations`/`messages` 테이블 — 자세한 내용은 [MESSAGING.md](./MESSAGING.md).
- 이 문서의 아래 스키마 스냅샷은 오래돼 있으니(예: User 컬럼 목록이 실제보다 적음) 정확한 최신 스키마는 `apps/web/prisma/schema.prisma`를 직접 확인할 것.
- 사진 파일 자체는 DB에 없다 — `Photo.storageKey`가 로컬 디스크 경로(`/uploads/...`)를 가리킬 뿐.

## 스키마 (실제)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  nickname     String
  createdAt    DateTime @default(now())

  trips Trip[]
}

model Trip {
  id        String   @id @default(cuid())
  userId    String
  name      String
  startDate DateTime
  endDate   DateTime
  personnel Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  places PlaceEntry[]

  @@index([userId])
}

model PlaceEntry {
  id               String    @id @default(cuid())
  tripId           String
  order            Int
  name             String
  category         String?
  lat              Float
  lng              Float
  address          String?
  roadAddress      String?
  placeUrl         String?
  scheduledAt      DateTime?
  transportToNext  String    @default("car") // "car" | "bus" — 이 장소에서 다음 장소로 갈 때 쓸 교통수단
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  trip     Trip          @relation(fields: [tripId], references: [id], onDelete: Cascade)
  expenses Expense[]
  photos   Photo[]

  routesFrom RouteSegment[] @relation("RouteFrom")
  routesTo   RouteSegment[] @relation("RouteTo")

  @@index([tripId, order])
}

model RouteSegment {
  id          String   @id @default(cuid())
  fromPlaceId String
  toPlaceId   String
  mode        String   // "car" | "bus"
  distanceM   Int
  durationSec Int
  fareWon     Int?
  detail      Json?    // mode="bus"일 때만: 지하철/버스 구간별 상세(TransitLeg[]) — routes.ts의 parseSubPath 참고
  computedAt  DateTime @default(now()) // 캐시 TTL 기준(10분, 코드 상수)

  fromPlace PlaceEntry @relation("RouteFrom", fields: [fromPlaceId], references: [id], onDelete: Cascade)
  toPlace   PlaceEntry @relation("RouteTo", fields: [toPlaceId], references: [id], onDelete: Cascade)

  @@unique([fromPlaceId, toPlaceId, mode])
}

model Expense {
  id           String   @id @default(cuid())
  placeEntryId String
  amount       Int
  memo         String?
  source       String   @default("manual") // "manual" | "card_auto"(카드 자동연동은 Phase 6, 미구현)
  createdAt    DateTime @default(now())

  placeEntry PlaceEntry @relation(fields: [placeEntryId], references: [id], onDelete: Cascade)

  @@index([placeEntryId])
}

model Photo {
  id           String    @id @default(cuid())
  placeEntryId String
  storageKey   String    // public/ 기준 상대경로, 예: /uploads/{tripId}/{placeId}/{uuid}.jpg
  takenAt      DateTime?
  createdAt    DateTime  @default(now())

  placeEntry PlaceEntry @relation(fields: [placeEntryId], references: [id], onDelete: Cascade)

  @@index([placeEntryId])
}
```

## 문자열 상태값 (native enum 대신 varchar 사용)

| 필드 | 값 | 비고 |
| --- | --- | --- |
| `PlaceEntry.transportToNext` | `car`, `bus` | 기본값 `car` |
| `RouteSegment.mode` | `car`, `bus` | `[fromPlaceId, toPlaceId, mode]` 유니크 |
| `Expense.source` | `manual`, `card_auto` | `card_auto`는 스키마만 마련, 실제 카드 연동은 Phase 6 |

Prisma에서 native enum 대신 `String` + 애플리케이션 레벨 타입(`"car" | "bus"`)으로 관리 — 값 종류가 적고 자주 안 바뀌어서 마이그레이션 부담을 지는 native enum이 아직 이득이 없다고 판단.

## AIParseJob(초안, 미구현)

README.md의 "데이터 모델 초안"에는 `AIParseJob`(id, trip_id, raw_text, parsed_json, status)이 있었지만, 실제로는 만들지 않았다. AI 파싱은 요청 1회로 파싱→지오코딩→응답까지 끝나는 동기 흐름이라 잡 상태를 저장할 테이블이 필요 없다 — 자세한 이유는 [AI.md](./AI.md) 참고.

## 후기(Review)는 좌표 기반

`Review`는 `PlaceEntry`(트립 안의 장소 사본)가 아니라 `lat`/`lng` 좌표로 실제 장소를 식별한다(`authorId`+`lat`+`lng` 유니크). 카카오 장소검색 결과는 같은 장소면 항상 같은 좌표를 주므로, 별도의 "실제 장소" 캐논니컬 테이블이나 카카오 장소 ID 수집 없이도 서로 다른 트립/사용자가 추가한 같은 장소를 매칭할 수 있다(2026-09-10). 이 덕분에:
- 트립이나 `PlaceEntry`를 지워도 이미 쓴 후기는 안 사라진다(실제 장소에 대한 개인 의견이 트립 편집에 딸려 사라지지 않음)
- 후기 공개범위는 트립의 `visibility`와 무관하게 항상 전체공개(카카오/네이버 방식)
- 별점은 트립 단위 공용 값이 아니라 후기마다 개인 값(`Review.rating`, 1~5)이고, 장소의 평균 별점은 조회 시점에 매칭되는 후기들로 계산한다(`lib/services/reviews.ts`의 `getReviewsForCoordinates`)

## 인덱스

- `Trip.userId` — 사용자별 여행 목록 조회
- `PlaceEntry.[tripId, order]` — 타임라인 순서 조회
- `Expense.placeEntryId`, `Photo.placeEntryId` — 장소별 조회
- `RouteSegment.[fromPlaceId, toPlaceId, mode]` (unique) — 캐시 upsert 키

## 관련 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [API.md](./API.md)
