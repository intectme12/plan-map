const FALLBACK_GRADIENT = "linear-gradient(135deg, #0f4c81 0%, #2f6fed 45%, #38bdf8 75%, #fbbf24 100%)";

// 대표사진(coverPhotoKey)을 배경으로 쓰는 여행 상세 히어로 배너 — 기존 TripMetaEditor/
// AIAssistantCard 등은 그대로 재사용하고 그 위에 얹을 카드 틀만 제공한다(기능 변경 없음).
export function TripHeroBanner({
  coverPhotoKey,
  children,
  aside,
}: {
  coverPhotoKey: string | null;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={
          coverPhotoKey ? { backgroundImage: `url(${coverPhotoKey})` } : { backgroundImage: FALLBACK_GRADIENT }
        }
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />

      <div className="relative flex min-h-[220px] flex-col-reverse justify-end gap-4 p-5 sm:min-h-[250px] sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div className="w-full max-w-md rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur">{children}</div>
        {aside ? <div className="w-full sm:w-auto">{aside}</div> : null}
      </div>
    </section>
  );
}
