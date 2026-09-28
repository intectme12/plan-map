const FALLBACK_IMAGE = "/images/hero-fallback.jpg";

// 대표사진(coverPhotoKey)을 배경으로 쓰는 여행 상세 히어로 배너 — 기존 TripMetaEditor는
// 그대로 재사용하고 그 위에 얹을 카드 틀만 제공한다(기능 변경 없음). 이제 지도 옆 AI
// 카드와 나란히 배치되지 않고 페이지 상단에 전체 폭 단독 영역으로 쓰여서, 폭 제약 없이
// 카드 자체 높이/패딩만으로 크기를 조절한다(직전엔 2배로 키웠다가 다시 2/3 정도로 축소).
// 콘텐츠는 흰 카드에 담지 않고 배경 사진과 어우러지도록 자식이 직접 색을 제어한다
// (제목/버튼을 흰 글씨·반투명으로 스타일링 — TripMetaEditor, SharedTripView 참고).
export function TripHeroBanner({
  coverPhotoKey,
  children,
  squareBottom = false,
  compact = false,
}: {
  coverPhotoKey: string | null;
  children: React.ReactNode;
  // 오른쪽 패널 맨 위에 합쳐 쓸 때(TripWorkspace.tsx)는 그 아래 탭과 이어지도록 아래쪽
  // 모서리를 각지게, 높이도 2/3 정도로 줄인다 — 단독 카드로 쓰는 곳(SharedTripView.tsx)은
  // 기본값(둥근 네 모서리·기존 높이) 그대로 유지.
  squareBottom?: boolean;
  compact?: boolean;
}) {
  return (
    <section className={`relative overflow-hidden ${squareBottom ? "rounded-t-3xl" : "rounded-3xl"}`}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${coverPhotoKey || FALLBACK_IMAGE})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />

      <div
        className={`relative flex items-center p-3 sm:p-4 ${
          compact ? "min-h-[110px] sm:min-h-[130px]" : "min-h-[165px] sm:min-h-[195px]"
        }`}
      >
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </section>
  );
}
