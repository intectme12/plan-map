import { z } from "zod";

// 새로 만들거나 바꾸는 닉네임의 최대 길이(가입·닉네임 변경·중복 확인·소셜 로그인 자동 생성 공통).
// 이 제한 이전에 만든 10자 초과 닉네임은 그대로 쓸 수 있고, 바꿀 때만 새 규칙을 따른다 —
// 그래서 공유 대상 지정처럼 "기존 닉네임을 찾는" 스키마는 여전히 50자까지 받는다.
export const NICKNAME_MAX_LENGTH = 10;
export const BIO_MAX_LENGTH = 300;
const nicknameSchema = z
  .string()
  .trim()
  .min(1, "닉네임을 입력해주세요.")
  .max(NICKNAME_MAX_LENGTH, `닉네임은 ${NICKNAME_MAX_LENGTH}자까지 입력할 수 있습니다.`);

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  nickname: nicknameSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const tripParticipantInputSchema = z.object({
  name: z.string().min(1).max(50),
  userId: z.string().optional(),
});

export const tripCategories = ["바다", "맛집", "카페", "액티비티", "자연", "도시"] as const;

// 여행 태그 — 기본 카테고리(tripCategories) 외에 사용자가 직접 입력한 태그도 허용한다.
// 홈 카테고리 필터(discoverTripsQuerySchema의 tag)는 여전히 기본 카테고리만 받으므로,
// 직접 입력 태그는 카드에 "#태그"로 표시만 되고 홈 카테고리 탭에는 안 뜬다.
export const TRIP_TAG_MAX_LENGTH = 15;
export const TRIP_TAGS_MAX_COUNT = 10;

const tripTagSchema = z
  .string()
  .transform((t) => t.trim().replace(/^#+/, "").trim())
  .pipe(z.string().min(1).max(TRIP_TAG_MAX_LENGTH).regex(/^[^\s#]+$/, "태그에는 공백이나 #을 넣을 수 없습니다."));

export const tripTagsSchema = z
  .array(tripTagSchema)
  .transform((tags) => [...new Set(tags)])
  .pipe(z.array(z.string()).max(TRIP_TAGS_MAX_COUNT));

export const TRIP_DATE_ORDER_MESSAGE = "종료일은 시작일과 같거나 이후여야 합니다.";

export const createTripSchema = z
  .object({
    name: z.string().min(1).max(100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    personnel: z.coerce.number().int().min(1).max(50).default(1),
    participants: z.array(tripParticipantInputSchema).max(50).optional(),
    tags: tripTagsSchema.optional(),
  })
  .refine((d) => d.endDate >= d.startDate, { message: TRIP_DATE_ORDER_MESSAGE, path: ["endDate"] });

export const tripVisibilities = ["PRIVATE", "UNLISTED", "PUBLIC"] as const;

// 날짜 중 하나만 바꾸는 요청은 여기서 비교할 수 없어 updateTrip(서비스)에서 DB 값과 합쳐 한 번 더 검사한다
export const updateTripSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    personnel: z.coerce.number().int().min(1).max(50).optional(),
    visibility: z.enum(tripVisibilities).optional(),
    tags: tripTagsSchema.optional(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: TRIP_DATE_ORDER_MESSAGE,
    path: ["endDate"],
  });

export const shareTripSchema = z.object({
  nickname: z.string().min(1).max(50),
});

export const sharedTripsQuerySchema = z.object({
  q: z.string().max(100).optional(),
  cursor: z.coerce.number().int().min(0).default(0),
  userId: z.string().optional(),
  tag: z.enum(tripCategories).optional(),
});

export const userSearchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  cursor: z.coerce.number().int().min(0).default(0),
});

export const followListQuerySchema = z.object({
  cursor: z.coerce.number().int().min(0).default(0),
});

export const followingTripsQuerySchema = z.object({
  cursor: z.coerce.number().int().min(0).default(0),
});

export const notificationsQuerySchema = z.object({
  cursor: z.coerce.number().int().min(0).default(0),
});

export const updateProfileFieldsSchema = z.object({
  bio: z.string().max(BIO_MAX_LENGTH).optional(),
  showTripsOnProfile: z.boolean().optional(),
});

export const createPlaceSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(50).optional(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  address: z.string().max(300).optional(),
  roadAddress: z.string().max(300).optional(),
  placeUrl: z.string().url().optional(),
  phone: z.string().max(50).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const expenseCategories = ["음식", "교통", "입장권", "숙소", "기타"] as const;

export const createExpenseSchema = z.object({
  category: z.enum(expenseCategories),
  amount: z.coerce.number().int().min(1).max(100_000_000),
  memo: z.string().max(200).optional(),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().min(1).max(2000),
});

// budgetWon/style/transport는 AI 프롬프트에 참고 컨텍스트로만 쓰이는 선택 입력값이라
// 값 자체에 엄격한 제약을 두지 않는다(길이 상한만 방어적으로 둠).
const aiPlanContextFields = {
  budgetWon: z.coerce.number().int().nonnegative().optional(),
  style: z.string().max(50).optional(),
  transport: z.string().max(50).optional(),
};

export const aiParseRequestSchema = z.object({
  text: z.string().min(10, "10자 이상 입력해주세요.").max(5000),
  ...aiPlanContextFields,
});

// 여행이 아직 없는 상태에서 AI로 새 여행을 만드는 플로우(POST /api/ai/parse-trip-text) 전용 —
// 이 여행의 실제 시작일/종료일/인원이 아직 DB에 없으니 클라이언트가 직접 보낸다.
export const aiParseNewTripRequestSchema = z.object({
  text: z.string().min(10, "10자 이상 입력해주세요.").max(5000),
  destination: z.string().min(1).max(100),
  dayCount: z.coerce.number().int().min(1).max(60),
  personnel: z.coerce.number().int().min(1).max(50),
  ...aiPlanContextFields,
});

export const updateProfileSchema = z.object({
  nickname: nicknameSchema,
});

export const nicknameCheckSchema = z.object({
  nickname: nicknameSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

export const createNoticeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10_000),
});

export const updateNoticeSchema = createNoticeSchema.partial();

export const updatePlaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().max(50).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  address: z.string().max(300).optional(),
  roadAddress: z.string().max(300).optional(),
  placeUrl: z.string().url().optional(),
  phone: z.string().max(50).optional(),
  scheduledAt: z.coerce.date().optional(),
  order: z.coerce.number().int().optional(),
});

export const createConversationSchema = z.object({
  userId: z.string().min(1),
});

export const messagesQuerySchema = z.object({
  before: z.coerce.date().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000).optional(),
});
