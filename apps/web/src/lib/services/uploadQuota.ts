import { RateLimitedError } from "../errors";
import { addUsage, assertRateLimits, RATE_RULES, remainingBudget } from "../rateLimit";

// 업로드 한도 — docs/SECURITY_PLAN.md 4단계. 장소 사진·대표사진·프로필 사진·메시지 사진을 합산한다.
// 10분 60장 + 하루 용량(UPLOAD_USER_DAILY_BYTES, 기본 300MB, 한국 자정 기준). 저장에 성공한 뒤에만 용량을 더한다.
// (평생 총 용량 상한은 사진 크기를 DB에 기록해야 해서, 오브젝트 스토리지로 옮길 때 같이 도입 — 그 전엔 일일 용량으로 증가 속도를 묶는다)
export async function withUploadQuota<T>(userId: string, bytes: number, save: () => Promise<T>): Promise<T> {
  await assertRateLimits(
    [{ rule: RATE_RULES.uploadPerUser10m, subject: userId }],
    "사진 업로드 요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
  );

  const budget = await remainingBudget(RATE_RULES.uploadBytesPerUserDay, userId);
  if (budget.remaining < bytes) {
    const limitMb = Math.round(RATE_RULES.uploadBytesPerUserDay.limit / 1024 / 1024);
    throw new RateLimitedError(
      `오늘 업로드할 수 있는 용량(${limitMb}MB)을 모두 사용했습니다. 내일 다시 시도해주세요.`,
      budget.retryAfterSec
    );
  }

  const result = await save();
  await addUsage(RATE_RULES.uploadBytesPerUserDay, userId, bytes);
  return result;
}
