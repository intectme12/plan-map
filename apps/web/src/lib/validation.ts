import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  nickname: z.string().min(1).max(50),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createTripSchema = z.object({
  name: z.string().min(1).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  personnel: z.coerce.number().int().min(1).max(50).default(1),
});

export const updateTripSchema = createTripSchema.partial();

export const createPlaceSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(50).optional(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  address: z.string().max(300).optional(),
  roadAddress: z.string().max(300).optional(),
  placeUrl: z.string().url().optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const expenseCategories = ["음식", "교통", "입장권", "숙소", "기타"] as const;

export const createExpenseSchema = z.object({
  category: z.enum(expenseCategories),
  amount: z.coerce.number().int().min(1).max(100_000_000),
  memo: z.string().max(200).optional(),
});

export const aiParseRequestSchema = z.object({
  text: z.string().min(10, "10자 이상 입력해주세요.").max(5000),
});

export const updatePlaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().max(50).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  address: z.string().max(300).optional(),
  roadAddress: z.string().max(300).optional(),
  placeUrl: z.string().url().optional(),
  scheduledAt: z.coerce.date().optional(),
  order: z.coerce.number().int().optional(),
});
