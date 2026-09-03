const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

export type GeocodeCandidate = {
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  roadAddress: string | null;
  placeUrl: string | null;
  category: string | null;
};

type KakaoKeywordDocument = {
  place_name: string;
  address_name: string | null;
  road_address_name: string | null;
  place_url: string | null;
  category_group_name: string | null;
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
    category: d.category_group_name || null,
  }));
}
