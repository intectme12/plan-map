import Groq from "groq-sdk";
import { z } from "zod";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// strict 모드 JSON Schema 요구사항(모든 필드가 required, 생략 가능한 값은 nullable 유니온)에 맞추려고
// optional 대신 nullable을 쓴다 — zod v4의 z.toJSONSchema()가 이 형태를 그대로 JSON Schema로 옮겨준다.
const extractedPlaceSchema = z.object({
  name: z.string().describe("장소명 (예: '경복궁', '봉피양 시청점')"),
  category: z.string().nullable().describe("장소 카테고리 (예: 관광지, 음식점, 카페, 숙소), 모르면 null"),
  areaHint: z
    .string()
    .nullable()
    .describe("동명 장소와 구분하기 위한 지역/주소 힌트 (예: '서울 종로구', '부산 해운대'), 모르면 null"),
  note: z.string().nullable().describe("원문에서 파악한 방문 시간, 메모 등, 없으면 null"),
});

const extractionResultSchema = z.object({
  places: z.array(extractedPlaceSchema).max(30),
});

export type ExtractedPlace = z.infer<typeof extractedPlaceSchema>;

export async function extractPlacesFromText(rawText: string): Promise<ExtractedPlace[] | null> {
  if (!GROQ_API_KEY) return null;

  const client = new Groq({ apiKey: GROQ_API_KEY });
  const response = await client.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          "여행 후기나 일정 텍스트에서 실제로 방문했거나 방문할 예정인 장소만 추출한다. " +
          "본문에 등장하는 순서를 유지하고, 장소인지 확실하지 않은 것은 제외한다.",
      },
      { role: "user", content: rawText },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "extraction_result",
        strict: true,
        schema: z.toJSONSchema(extractionResultSchema),
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return null;

  const parsed = extractionResultSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    console.error("Groq 응답이 예상한 스키마와 다릅니다:", parsed.error);
    return null;
  }

  return parsed.data.places;
}
