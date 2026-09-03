# Design System

화면 구조/인터랙션 규칙은 [DESIGN.md](../DESIGN.md)를 참고 — 이 문서는 그중 **시각적 토큰**(색상/타이포/간격/컴포넌트)만 뽑아 AI 코딩 에이전트가 화면마다 다른 스타일을 발명하지 않도록 참고하는 용도다. 동작/UX 체크리스트는 [UI_RULES.md](./UI_RULES.md), AI 에이전트 프롬프팅 규칙은 [AI_CODING_RULES.md](./AI_CODING_RULES.md).

## 0. 현재 상태 — 정직하게

DESIGN.md는 Tailwind CSS + shadcn/ui(Radix 기반) + lucide-react 채택을 명시했지만, **아직 코드에는 도입되지 않았다**(`apps/web/package.json`에 `shadcn`/`@radix-ui`/`lucide-react` 없음, `components/ui/` 디렉토리도 없음). 지금은 순수 Tailwind 유틸리티 클래스만 손으로 짜고 있다. 아이콘도 lucide-react 대신 인라인 SVG 하나(드래그 핸들, `PlaceList.tsx`)만 있다.

새 화면을 만들 때 규칙:

1. **먼저 기존 컴포넌트의 클래스 조합을 확인하고 그대로 재사용한다** — 아래 "실제 사용 중인 값" 표가 그 사전 역할을 한다.
2. shadcn/ui를 실제로 도입하기 전까지는 새로운 컴포넌트 라이브러리를 끌어들이지 않는다(예: 어떤 화면에서만 별도로 MUI나 다른 UI 킷을 쓰지 않기).
3. 아래 표에 없는 색상/radius/그림자 값이 필요하면, 임의로 만들지 말고 먼저 이 문서에 추가할지 판단한다.

## 1. 컬러

DESIGN.md가 정의한 목표 팔레트:

```text
primary       #2F6FED   지도 마커/주요 버튼 (신뢰감 있는 블루)
accent        #FF7A45   교통/이동 강조, 지출 관련 (웜톤)
neutral       Tailwind slate 스케일 (slate-50 배경 ~ slate-900 텍스트)
success       #16A34A
warning       #D97706
danger        #DC2626
```

**실제 코드에서 쓰는 값** (2026-09-03 기준, 코드베이스 grep 결과) — 위 목표 팔레트를 아직 전면 적용하지 않고 Tailwind 기본 팔레트를 그대로 쓰는 중:

```text
버튼/강조         bg-blue-600, text-blue-600      (목표 primary #2F6FED와 유사하지만 미통일)
교통 칩(버스)      bg-orange-100 text-orange-700 ring-orange-400
성공/포인트 텍스트  없음 — 아직 success/warning/danger 시맨틱 컬러를 쓰는 화면이 없음
중립/보더          neutral-* / slate-* 혼용(neutral-200 보더, neutral-500 보조텍스트 등)
에러 텍스트        text-red-600
경고 뱃지          bg-amber-100 text-amber-700   (AI 확인화면의 "동명 장소" 뱃지)
```

새 화면을 만들 때는 `blue-600`/`neutral-*`처럼 이미 쓰이는 Tailwind 토큰을 우선 재사용한다. primary를 DESIGN.md의 `#2F6FED`로 전면 통일하는 작업은 아직 안 했다 — 유일한 예외는 비용 탭의 카테고리별 도넛 차트(`ExpenseSummary.tsx`)로, 여기서는 DESIGN.md의 원본 hex 값(`#2F6FED`/`#FF7A45`/`#16A34A`/`#D97706`/`#DC2626`)을 그대로 배열로 박아 썼다. 나머지 버튼/보더 등은 여전히 Tailwind 기본 팔레트(`blue-600` 등)다 — CSS 변수(`:root`)로 뽑아 전체를 통일하는 리팩터링은 앞으로 할 일.

## 2. 타이포그래피

- 폰트: DESIGN.md는 Pretendard를 지정했지만, 코드는 아직 Next.js 스캐폴딩 기본값인 **Geist Sans / Geist Mono**(`next/font/google`)를 쓰고 있다(`app/layout.tsx`) — Pretendard로 교체 안 함.
- 숫자: 지출 금액 등에는 `tabular-nums` 사용(`ExpenseSummary.tsx`).
- 크기: 본문 `text-sm`이 기본, 보조 텍스트 `text-xs`, 페이지 제목 `text-lg font-bold`.

## 3. 반경 / 그림자

```text
card radius     rounded-md (6px) 대부분, 모달/큰 카드만 rounded-lg (8px)
                DESIGN.md 목표값(12px)보다 작게 쓰이는 중 — 통일 안 됨
그림자           shadow-sm 또는 shadow(버튼/오버레이 패널) 정도만, 과한 그림자 없음
보더             border border-neutral-200/300 위주 — DESIGN.md의 "그림자 최소화, 보더로 구분" 원칙은 지키고 있음
```

## 4. 레이아웃

- 여행 상세 화면: 지도가 전체 화면을 채우고(`absolute inset-0`), 오른쪽에 고정폭 380px 사이드바(`aside` `w-[380px]`)가 얹힌다 — DESIGN.md "지도가 주인공" 원칙 그대로 구현됨.
- 사이드바 내부는 세로 flex: 헤더(여행 정보) → 탭(`?tab=timeline|expense|photos`) → 탭별 컨텐츠(스크롤 영역 `min-h-0 flex-1`).
- 모바일 반응형(지도/리스트 하단 탭 전환)은 DESIGN.md에 명시돼 있지만 **아직 구현 안 됨** — 지금은 데스크톱 2-pane 레이아웃만 존재.

## 5. 컴포넌트 패턴 (재사용해야 할 것들)

| 패턴 | 예시 | 비고 |
| --- | --- | --- |
| 인라인 수정 폼 | `TripMetaEditor.tsx`, `PlaceForm.tsx` | `useState` + `onSubmit` + 저장 중 `disabled`, 에러는 `text-xs text-red-600` |
| 삭제 + 실행취소 토스트 | `PlaceList.tsx`의 `handleDelete` + `ToastProvider` | `confirm()`/`alert()` 금지(DESIGN.md 원칙), 5초 뒤 실제 삭제, 그 전엔 토스트의 "실행취소" 버튼으로 되돌림 |
| 드래그 정렬 | `PlaceList.tsx` (`@dnd-kit`) | 드롭 즉시 optimistic update, 저장 API는 500ms 디바운스 |
| 외부 API 폴백 표시 | `RouteSegmentRow.tsx`("교통 API 키 설정 필요") | 에러 배너 대신 회색 안내 텍스트로 조용히 표시 |
| 직접 만든 오버레이 모달 | `PlacePhotos.tsx` | `fixed inset-0 bg-black/40` + 바깥 클릭 닫기. Radix Dialog 등은 아직 안 씀 |
| 탭 네비게이션 | `trips/[tripId]/page.tsx`의 `TABS` | 서버 컴포넌트에서 `searchParams.tab`으로 분기, `Link`만으로 구현(클라이언트 상태 없음) |

## 6. 아이콘 / 이미지

- 아이콘: 인라인 SVG 하나(드래그 핸들)만 존재, 이모지를 아이콘 대용으로 쓰는 곳이 많음(✨ AI 가져오기 버튼, 💰 지출 입력 등). lucide-react 미도입.
- 사진: `<img>` 태그 직접 사용(`next/image` 아님) — 로컬 디스크에 저장된 파일을 `public/uploads/...` 경로로 바로 서빙하기 때문에 최적화 파이프라인이 필요 없다고 판단.

## 7. 다크모드

MVP 범위 아님(DESIGN.md). 색상을 나중에 CSS 변수로 뽑을 때 다크모드 대응이 되도록만 준비하고, 지금 당장 라이트/다크 분기 코드는 넣지 않는다.

## 관련 문서

- [DESIGN.md](../DESIGN.md) — 화면 구조, 인터랙션 규칙, 원본 팔레트 결정
- [UI_RULES.md](./UI_RULES.md)
- [AI_CODING_RULES.md](./AI_CODING_RULES.md)
