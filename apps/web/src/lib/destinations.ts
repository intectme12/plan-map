// 홈 화면 Hero의 "오늘의 추천 여행지"용 큐레이션 목록. 별도 콘텐츠 관리 기능이 생기기 전까지는
// 코드에 고정된 목록에서 날짜 기준으로 하나를 골라 보여준다(매일 자정 기준으로 순환).
export type CuratedDestination = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tagline: string;
};

export const CURATED_DESTINATIONS: CuratedDestination[] = [
  { id: "gangneung", name: "강릉", lat: 37.7519, lng: 128.8761, tagline: "바다와 카페, 그리고 맛있는 여행" },
  { id: "jeju", name: "제주", lat: 33.4996, lng: 126.5312, tagline: "자연 그대로의 섬을 만나보세요" },
  { id: "busan", name: "부산", lat: 35.1796, lng: 129.0756, tagline: "해운대의 파도와 도시의 활기" },
  { id: "jeonju", name: "전주", lat: 35.8242, lng: 127.148, tagline: "한옥마을에서 즐기는 감성 여행" },
  { id: "gyeongju", name: "경주", lat: 35.8562, lng: 129.2247, tagline: "천년의 역사를 걷다" },
  { id: "yeosu", name: "여수", lat: 34.7604, lng: 127.6622, tagline: "밤바다가 아름다운 항구도시" },
  { id: "sokcho", name: "속초", lat: 38.207, lng: 128.5918, tagline: "설악산과 동해가 함께하는 곳" },
];

export function todaysDestination(): CuratedDestination {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return CURATED_DESTINATIONS[dayIndex % CURATED_DESTINATIONS.length];
}
