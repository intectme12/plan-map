import { Search, MapPin } from "lucide-react";
import type { CuratedDestination } from "@/lib/destinations";
import type { WeatherSummary } from "@/lib/weather";

// 실제 여행지 사진이 있으면(가장 인기 있는 공개 여행의 대표사진) 그걸 배경으로 쓰고, 없으면
// 저작권 걱정 없는 자체 그라디언트로 대체한다 — 외부 스톡 이미지를 무단으로 가져오지 않기 위함.
const FALLBACK_GRADIENT =
  "linear-gradient(135deg, #0f4c81 0%, #2f6fed 45%, #38bdf8 75%, #fbbf24 100%)";

export function HomeHero({
  destination,
  weather,
  heroImageUrl,
  searchBox,
}: {
  destination: CuratedDestination;
  weather: WeatherSummary | null;
  heroImageUrl?: string | null;
  searchBox?: React.ReactNode;
}) {
  return (
    <section className="relative mt-6 overflow-hidden rounded-3xl">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={
          heroImageUrl
            ? { backgroundImage: `url(${heroImageUrl})` }
            : { backgroundImage: FALLBACK_GRADIENT }
        }
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

      <div className="relative flex flex-col px-6 py-14 sm:px-10 sm:py-20 lg:min-h-[440px]">
        <h1 className="max-w-xl text-3xl leading-tight font-bold text-white sm:text-5xl">
          다음 여행은
          <br />
          어디로 갈까요? ✈
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/90 sm:text-base">
          지도로 찾고, 사진으로 발견하고,
          <br />
          AI가 제안하는 나만의 여행 계획
        </p>

        {searchBox ?? (
          <form action="/trips" method="GET" className="mt-8 flex w-full max-w-xl">
            <input type="hidden" name="tab" value="shared" />
            <div className="flex w-full items-center gap-2 rounded-2xl bg-white p-1.5 pl-4 shadow-lg">
              <Search className="h-5 w-5 flex-none text-neutral-400" />
              <input
                name="q"
                placeholder="어디로 여행을 떠나고 싶으세요?"
                className="min-w-0 flex-1 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
              <button
                type="submit"
                aria-label="검색"
                className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 w-full max-w-[220px] rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur lg:absolute lg:top-10 lg:right-10 lg:mt-0">
          <p className="flex items-center gap-1 text-xs font-medium text-neutral-500">
            <MapPin className="h-3.5 w-3.5" /> 오늘의 추천 여행지
          </p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{destination.name}</p>
          <p className="mt-1 text-xs text-neutral-500">{destination.tagline}</p>
          {weather ? (
            <div className="mt-3 flex items-center gap-2 border-t border-neutral-200 pt-3">
              <span className="text-xl">{weather.emoji}</span>
              <span className="text-lg font-semibold text-neutral-900">{weather.tempC}°</span>
              <span className="text-xs text-neutral-500">{weather.label}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
