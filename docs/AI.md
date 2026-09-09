# AI

**상태:** 구현됨(Phase 3, F4) — `apps/web/src/lib/services/{aiParse,geocode,aiImport}.ts`. 여행 후기/일정 텍스트를 붙여넣으면 장소 후보를 추출해 지도에 미리 보여주고, 사용자가 선택한 것만 일괄로 일정에 추가한다.

## 개요

1. **파싱** (`aiParse.ts`) — Claude API에 원문 텍스트를 보내 장소명/카테고리/지역힌트를 구조화 출력으로 추출.
2. **지오코딩** (`geocode.ts`) — 추출된 각 장소명을 카카오 로컬 키워드 검색으로 좌표 후보(최대 5개)로 매칭.
3. **조합 + 소유권 검증** (`aiImport.ts`) — 여행 소유권 확인 후 위 둘을 순서대로 호출, 결과를 합쳐서 반환.
4. **확인 UI** (`app/trips/[tripId]/import/`) — 후보 카드 리스트(체크박스 기본 선택) + 지도 마커. 동명 장소처럼 후보가 여러 개면 노란 뱃지("동명 장소 N곳 — 확인 필요")와 선택 드롭다운을 보여준다. "선택한 N개 일정에 추가" 버튼으로 일괄 커밋.

## 상태 없는 동기 흐름 (잡 큐를 안 쓰는 이유)

README 초안에는 `AIParseJob`(비동기 작업 테이블)이 있었지만 실제로는 만들지 않았다. 이유:

- Claude 호출 + 장소당 카카오 검색 호출이 전부 초 단위로 끝나는 짧은 요청이라, 비동기 잡 큐(Redis 등)로 처리해야 할 만큼 느리지 않다.
- 요청-응답 1왕복으로 파싱부터 지오코딩까지 다 끝내고 결과를 프런트에 바로 돌려준다. 재시도/이력 조회 같은 잡 큐 특유의 요구사항이 없다.
- 화면 수가 적은 지금 단계에서 잡 상태 테이블+폴링 UI를 만드는 건 조기 추상화라고 판단(README의 다른 "보류" 결정들과 같은 기준).

## Groq API 사용 방식

- 모델: `openai/gpt-oss-120b`(Groq 프로덕션 모델 중 structured outputs strict 모드를 지원하는 것 — 속도/비용 우선이면 `openai/gpt-oss-20b`로 낮출 수 있음). 2026-09-09 세션에서 Claude(`claude-opus-5`)에서 교체(비용/속도 목적, 사용자 요청).
- `groq-sdk`의 `chat.completions.create()` + `response_format: { type: "json_schema", json_schema: { strict: true, schema } }`로 구조화 출력을 요청한다. Anthropic SDK의 `messages.parse()`처럼 "zod 스키마 넣으면 자동 검증된 객체로 파싱"해주는 헬퍼가 없어서, `schema`는 zod v4의 **`z.toJSONSchema()`**(내장, 별도 패키지 불필요)로 직접 변환해 넘기고, 응답 문자열은 `JSON.parse()` 후 같은 zod 스키마로 `safeParse()`해서 우리가 직접 검증한다.
- 스키마: `{ places: [{ name, category, areaHint, note }] }` — `category`/`areaHint`/`note`는 **`nullable`**(optional 아님). Groq strict 모드는 "모든 필드가 `required`, 생략 가능한 값은 `nullable` 유니온으로 표현"을 요구해서(OpenAI 계열 structured outputs 공통 제약), zod의 `.optional()` 대신 `.nullable()`을 쓴 것 — 이러면 `z.toJSONSchema()`가 자동으로 `required`에 넣고 `type: ["string","null"]`로 만들어준다. 소비하는 쪽(`aiImport.ts`)은 `undefined` 대신 `null`을 받는 것 외엔 동일.
- 시스템 프롬프트: "실제로 방문했거나 방문할 예정인 장소만 추출, 원문 순서 유지, 확실하지 않으면 제외." (기존 그대로)
- `GROQ_API_KEY` 미설정 시 `extractPlacesFromText()`가 `null`을 반환 → `aiImport.ts`가 `ServiceUnavailableError`를 던져 API가 `503`을 반환한다. 카카오/ODsay처럼 "키 없으면 조용히 폴백"하지 않는 이유는, 이 기능 자체가 응답 없이는 아무것도 할 수 없기 때문(대체 경로가 없음) — Groq 응답이 스키마와 안 맞는 극히 드문 경우도 같은 경로(`null` → 503)로 처리하고 재시도는 하지 않는다.

## 지오코딩 폴백

카카오 REST API 키가 없거나 호출이 실패하면 `searchPlaceCandidates()`가 `null`을 반환하고, `aiImport.ts`는 이를 빈 배열(`candidates: []`)로 취급한다. 이 경우 확인 화면에서 해당 장소는 "위치를 찾지 못했습니다" 문구와 함께 체크박스가 비활성화된 채로 표시된다 — Claude 추출 자체는 성공했으므로 전체 요청을 실패시키지 않는다. 이 패턴(키 없으면 빈 결과/폴백, 에러 아님)은 카카오모빌리티/ODsay 서비스와 동일 — 자세한 내용은 [PUBLISHING.md](./PUBLISHING.md).

## 시크릿

- `GROQ_API_KEY` — https://console.groq.com 발급, `apps/web/.env`에 설정. 절대 커밋 금지(`.env`는 gitignore 처리됨).

## 미구현/보류

- RAG 어시스턴트, 임베딩 검색 같은 건 없음 — 이 기능은 순수 추출+지오코딩이다.
- 후보를 실제로 반영하는 별도 "커밋" API는 없다 — 프런트가 기존 장소 생성 API(`POST /api/trips/{tripId}/places`)를 사용자가 선택한 후보 수만큼 순차 호출한다(순서(order)가 서버에서 "마지막+1"로 계산되기 때문에 병렬 호출 시 경쟁 상태가 생길 수 있어 의도적으로 순차 처리).

## 관련 문서

- [API.md](./API.md)
- [PUBLISHING.md](./PUBLISHING.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
