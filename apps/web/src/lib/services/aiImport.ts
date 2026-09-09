import { ServiceUnavailableError } from "../errors";
import { assertTripEditAccess } from "./tripAccess";
import { extractPlacesFromText } from "./aiParse";
import { searchPlaceCandidates, type GeocodeCandidate } from "./geocode";

export type ImportCandidate = {
  name: string;
  category: string | null;
  note: string | null;
  candidates: GeocodeCandidate[];
};

export async function parseTripText(
  userId: string,
  tripId: string,
  rawText: string
): Promise<ImportCandidate[]> {
  await assertTripEditAccess(userId, tripId);

  const extracted = await extractPlacesFromText(rawText);
  if (extracted === null) {
    throw new ServiceUnavailableError(
      "AI 자동생성 기능을 사용하려면 GROQ_API_KEY 설정이 필요합니다."
    );
  }

  const results: ImportCandidate[] = [];
  for (const place of extracted) {
    const query = place.areaHint ? `${place.areaHint} ${place.name}` : place.name;
    const geocoded = await searchPlaceCandidates(query);
    results.push({
      name: place.name,
      category: place.category,
      note: place.note,
      candidates: geocoded ?? [],
    });
  }
  return results;
}
