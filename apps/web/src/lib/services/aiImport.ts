import { prisma } from "../db";
import { NotFoundError, ServiceUnavailableError } from "../errors";
import { extractPlacesFromText } from "./aiParse";
import { searchPlaceCandidates, type GeocodeCandidate } from "./geocode";

async function assertTripOwnership(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId }, select: { id: true } });
  if (!trip) throw new NotFoundError("여행을 찾을 수 없습니다.");
}

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
  await assertTripOwnership(userId, tripId);

  const extracted = await extractPlacesFromText(rawText);
  if (extracted === null) {
    throw new ServiceUnavailableError(
      "AI 자동생성 기능을 사용하려면 ANTHROPIC_API_KEY 설정이 필요합니다."
    );
  }

  const results: ImportCandidate[] = [];
  for (const place of extracted) {
    const query = place.areaHint ? `${place.areaHint} ${place.name}` : place.name;
    const geocoded = await searchPlaceCandidates(query);
    results.push({
      name: place.name,
      category: place.category ?? null,
      note: place.note ?? null,
      candidates: geocoded ?? [],
    });
  }
  return results;
}
