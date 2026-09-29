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
  dayIndex: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe("본문에 몇 일차 방문인지 명시돼 있으면 0부터 시작하는 일차 번호, 모르면 null"),
  reason: z.string().nullable().describe("원문 맥락에서 파악한 이 장소를 추천/방문하는 이유, 없으면 null"),
  estimatedStayMin: z.number().int().positive().nullable().describe("예상 체류 시간(분), 추정 불가하면 null"),
  estimatedCostWon: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe("1인 기준 예상 비용(원, 입장료+식비 등 원문 근거 기반 추정), 추정 불가하면 null"),
});

const extractionResultSchema = z.object({
  places: z.array(extractedPlaceSchema).max(30),
});

export type ExtractedPlace = z.infer<typeof extractedPlaceSchema>;

export type ExtractPlacesContext = {
  destination?: string;
  dayCount?: number;
  personnel?: number;
  budgetWon?: number;
  style?: string;
  transport?: string;
};

function buildContextLine(context?: ExtractPlacesContext): string | null {
  if (!context) return null;
  const parts: string[] = [];
  if (context.destination) parts.push(`여행지는 ${context.destination}`);
  if (context.dayCount) parts.push(`총 ${context.dayCount}일 일정`);
  if (context.personnel) parts.push(`인원 ${context.personnel}명`);
  if (context.budgetWon) parts.push(`예산 약 ${context.budgetWon.toLocaleString()}원`);
  if (context.style) parts.push(`여행 스타일은 ${context.style}`);
  if (context.transport) parts.push(`주 이동수단은 ${context.transport}`);
  if (parts.length === 0) return null;

  const dayRule = context.dayCount
    ? ` dayIndex는 반드시 0~${context.dayCount - 1} 범위 안에서만 추론한다.`
    : "";
  return `이 여행은 ${parts.join(", ")}이다. 이 정보를 참고해 일차 배분과 추천 이유·예상 체류시간·예상 비용을 판단한다.${dayRule}`;
}

export async function extractPlacesFromText(
  rawText: string,
  context?: ExtractPlacesContext
): Promise<ExtractedPlace[] | null> {
  if (!GROQ_API_KEY) return null;

  const contextLine = buildContextLine(context);
  const client = new Groq({ apiKey: GROQ_API_KEY });
  const response = await client.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          "여행 후기나 일정 텍스트에서 실제로 방문했거나 방문할 예정인 장소만 추출한다. " +
          "본문에 등장하는 순서를 유지하고, 장소인지 확실하지 않은 것은 제외한다." +
          (contextLine ? ` ${contextLine}` : ""),
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
