// Open-Meteo는 API 키가 필요 없는 무료 날씨 API라, 홈 화면 "오늘의 추천 여행지" 위젯에
// 별도 키 발급/환경변수 설정 없이 바로 붙일 수 있다.
const WEATHER_CODE_LABELS: Record<number, { label: string; emoji: string }> = {
  0: { label: "맑음", emoji: "☀️" },
  1: { label: "대체로 맑음", emoji: "🌤️" },
  2: { label: "구름 조금", emoji: "⛅" },
  3: { label: "흐림", emoji: "☁️" },
  45: { label: "안개", emoji: "🌫️" },
  48: { label: "안개", emoji: "🌫️" },
  51: { label: "이슬비", emoji: "🌦️" },
  53: { label: "이슬비", emoji: "🌦️" },
  55: { label: "이슬비", emoji: "🌦️" },
  61: { label: "비", emoji: "🌧️" },
  63: { label: "비", emoji: "🌧️" },
  65: { label: "강한 비", emoji: "🌧️" },
  71: { label: "눈", emoji: "🌨️" },
  73: { label: "눈", emoji: "🌨️" },
  75: { label: "강한 눈", emoji: "❄️" },
  80: { label: "소나기", emoji: "🌦️" },
  81: { label: "소나기", emoji: "🌦️" },
  82: { label: "강한 소나기", emoji: "⛈️" },
  95: { label: "뇌우", emoji: "⛈️" },
};

export type WeatherSummary = { tempC: number; label: string; emoji: string };

export async function fetchCurrentWeather(lat: number, lng: number): Promise<WeatherSummary | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;

    const data = await res.json();
    const current = data?.current_weather;
    if (!current || typeof current.temperature !== "number") return null;

    const code = WEATHER_CODE_LABELS[current.weathercode] ?? { label: "-", emoji: "🌡️" };
    return { tempC: Math.round(current.temperature), label: code.label, emoji: code.emoji };
  } catch {
    return null;
  }
}
