const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

export type GeocodeCandidate = {
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  roadAddress: string | null;
  placeUrl: string | null;
  category: string | null;
  phone: string | null;
};

type KakaoKeywordDocument = {
  place_name: string;
  address_name: string | null;
  road_address_name: string | null;
  place_url: string | null;
  category_name: string | null;
  category_group_name: string | null;
  phone: string | null;
  x: string;
  y: string;
};

// 키워드로 장소 검색해 좌표 후보를 반환. 카카오 키 미설정/호출 실패 시 null(geocoding 불가 상태).
export async function searchPlaceCandidates(query: string): Promise<GeocodeCandidate[] | null> {
  if (!KAKAO_REST_API_KEY) return null;

  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "5");

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const documents: KakaoKeywordDocument[] = data?.documents ?? [];

  return documents.map((d) => ({
    name: d.place_name,
    lat: Number(d.y),
    lng: Number(d.x),
    address: d.address_name || null,
    roadAddress: d.road_address_name || null,
    placeUrl: d.place_url || null,
    // category_group_name은 정해진 대분류(음식점/카페/병원 등)에만 채워지고 나머지는 빈 문자열이라
    // 항상 채워지는 category_name(전체 경로, 예: "여행 > 관광,명소 > 자연관광지")을 사용한다.
    category: d.category_name || d.category_group_name || null,
    phone: d.phone || null,
  }));
}
