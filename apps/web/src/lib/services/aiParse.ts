import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const extractedPlaceSchema = z.object({
  name: z.string().describe("장소명 (예: '경복궁', '봉피양 시청점')"),
  category: z.string().optional().describe("장소 카테고리 (예: 관광지, 음식점, 카페, 숙소)"),
  areaHint: z
    .string()
    .optional()
    .describe("동명 장소와 구분하기 위한 지역/주소 힌트 (예: '서울 종로구', '부산 해운대')"),
  note: z.string().optional().describe("원문에서 파악한 방문 시간, 메모 등"),
});

const extractionResultSchema = z.object({
  places: z.array(extractedPlaceSchema).max(30),
});

export type ExtractedPlace = z.infer<typeof extractedPlaceSchema>;

export async function extractPlacesFromText(rawText: string): Promise<ExtractedPlace[] | null> {
  if (!ANTHROPIC_API_KEY) return null;

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system:
      "여행 후기나 일정 텍스트에서 실제로 방문했거나 방문할 예정인 장소만 추출한다. " +
      "본문에 등장하는 순서를 유지하고, 장소인지 확실하지 않은 것은 제외한다.",
    messages: [{ role: "user", content: rawText }],
    output_config: { format: zodOutputFormat(extractionResultSchema) },
  });

  return response.parsed_output?.places ?? [];
}
