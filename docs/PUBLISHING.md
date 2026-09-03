# 외부 API 연동 (Publishing 아님)

**상태:** plan-map에는 "소셜 플랫폼에 게시(publish)"라는 개념이 없다 — 이 문서는 원래 다른(소셜 게시 SaaS) 참고 문서에서 "게시 파이프라인/작업 큐" 자리였지만, 대신 우리 프로젝트가 실제로 반복하고 있는 패턴인 **외부 API 연동 방식**을 정리한다. 잡 큐, 재시도 워커, `publish_jobs` 같은 건 이 프로젝트에 없다 — [ARCHITECTURE.md](./ARCHITECTURE.md)의 "큐/워커 없음" 결정 참고.

## 연동 중인 외부 API

| 서비스 | 용도 | 서비스 파일 | 필요 키 |
| --- | --- | --- | --- |
| 카카오맵 JS SDK | 지도 렌더링(클라이언트) | `components/map/KakaoMapCanvas.tsx` | `NEXT_PUBLIC_KAKAO_JS_KEY` |
| 카카오모빌리티 Directions API | 자동차 경로 | `lib/services/routes.ts` | `KAKAO_REST_API_KEY` |
| 카카오 로컬 키워드 검색 | 장소명 → 좌표 지오코딩 | `lib/services/geocode.ts` | `KAKAO_REST_API_KEY` |
| ODsay | 대중교통(버스) 경로 | `lib/services/routes.ts` | `ODSAY_API_KEY` |
| Claude API | AI 일정 텍스트 파싱 | `lib/services/aiParse.ts` | `ANTHROPIC_API_KEY` |

## 공통 패턴: 키 없으면 폴백, 있으면 캐시

모든 서비스 파일이 같은 모양을 따른다:

```ts
const API_KEY = process.env.SOME_API_KEY;

async function callExternalApi(...) {
  if (!API_KEY) return null;          // 키 미설정 → 조용히 null
  const res = await fetch(...);
  if (!res.ok) return null;            // 호출 실패 → 조용히 null
  return parseResponse(await res.json());
}
```

호출부는 `null`을 "이 기능은 지금 못 씀"으로 해석해 에러를 던지지 않고 UI에 안전하게 표시한다(`RouteSegmentRow.tsx`의 "교통 API 키 설정 필요" 문구가 대표적인 예). 이 패턴 덕분에:

- 로컬 개발 중 아직 키를 안 받았어도 나머지 기능(여행/장소 CRUD 등)이 전부 정상 동작한다.
- 실제로 이 프로젝트를 열 때마다 키가 없는 상태로 여러 번 테스트됐고, 그때마다 이 폴백이 500 에러 없이 잘 동작하는지 확인했다(Phase 2/3 진행 상황 참고).

**예외: Claude API는 이 패턴을 따르지 않는다.** AI 파싱은 Claude 응답 없이는 아무 것도 할 수 없으므로(대체 경로 없음), 키 미설정 시 `null` 대신 `ServiceUnavailableError`를 던져 API가 명시적으로 `503`을 반환한다 — 자세한 내용은 [AI.md](./AI.md).

## 캐싱

경로 조회(카카오모빌리티/ODsay)만 캐시가 있다 — 동일 `[출발지, 도착지, 수단]` 조합은 `RouteSegment` 테이블에 저장하고 `computedAt` 기준 10분 TTL로 재사용한다(`lib/services/routes.ts`의 `CACHE_TTL_MS`). 지오코딩(카카오 로컬 검색)이나 Claude 파싱 결과는 캐시하지 않는다 — 매번 새 텍스트를 파싱하는 게 보통이라 캐시 히트율이 낮을 것으로 판단, 필요해지면 나중에 추가.

## 시크릿 관리

- `apps/web/.env.example`에 필요한 키 이름과 발급처를 주석으로 남겨둔다. 실제 값은 `apps/web/.env`(gitignore 처리, 커밋 안 됨)에만 넣는다.
- 로그에 API 키나 응답 원문을 그대로 남기지 않는다.

## 관련 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [AI.md](./AI.md)
- [API.md](./API.md)
