import { prisma } from "../db";
import { ForbiddenError, RateLimitedError } from "../errors";
import { ConcurrencyLimiter } from "../externalGuard";
import { assertRateLimits, GLOBAL_SUBJECT, RATE_RULES, type RateCheck } from "../rateLimit";

// 여행 대량 생성 방어 — docs/SECURITY_PLAN.md 3단계.
// 속도(분·일 단위 횟수) + 총량(보유 여행 수, 여행당 장소 수) + 동시 생성 1개 + 서비스 전체 생성량.

export const TRIP_LIMITS = {
  maxOwnedTrips: 300,
  maxPlacesPerTrip: 150,
  newAccountMs: 24 * 60 * 60 * 1000,
};

export type QuotaUser = { id: string; createdAt: Date };

export function isNewAccount(user: QuotaUser, now = Date.now()) {
  return now - user.createdAt.getTime() < TRIP_LIMITS.newAccountMs;
}

// 사용자당 동시에 하나만(더블클릭·병렬 요청으로 한도 검사 사이를 비집고 들어오는 것 방지), 서버 전체 50개
const tripWriteConcurrency = new ConcurrencyLimiter(1, 50);

export async function withTripWriteSlot<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const slot = tripWriteConcurrency.tryAcquire(userId);
  if (!slot.ok) {
    throw new RateLimitedError(
      slot.reason === "key" ? "이미 여행을 만들고 있습니다. 잠시 후 다시 시도해주세요." : undefined,
      2
    );
  }
  try {
    return await fn();
  } finally {
    slot.release();
  }
}

// kind: create(새로 만들기) / copy(공개 여행 복사). 둘 다 보유 여행 수와 서비스 전체 생성량에 들어간다.
export async function assertCanCreateTrip(user: QuotaUser, kind: "create" | "copy") {
  const fresh = isNewAccount(user);
  const checks: RateCheck[] =
    kind === "create"
      ? [
          { rule: RATE_RULES.tripCreatePerUserMin, subject: user.id },
          { rule: fresh ? RATE_RULES.tripCreateNewUserDay : RATE_RULES.tripCreatePerUserDay, subject: user.id },
        ]
      : [
          { rule: RATE_RULES.tripCopyPerUserHour, subject: user.id },
          ...(fresh ? [{ rule: RATE_RULES.tripCopyNewUserDay, subject: user.id }] : []),
        ];
  checks.push({ rule: RATE_RULES.tripWriteGlobalMin, subject: GLOBAL_SUBJECT });

  await assertRateLimits(
    checks,
    fresh
      ? "가입 첫날에는 여행을 만들 수 있는 횟수가 제한됩니다. 잠시 후 다시 시도해주세요."
      : "여행 생성 요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
  );

  const owned = await prisma.trip.count({ where: { userId: user.id } });
  if (owned >= TRIP_LIMITS.maxOwnedTrips) {
    throw new ForbiddenError(
      `여행은 최대 ${TRIP_LIMITS.maxOwnedTrips}개까지 만들 수 있습니다. 사용하지 않는 여행을 정리한 뒤 다시 시도해주세요.`
    );
  }
}

export async function assertCanAddPlace(userId: string, tripId: string) {
  await assertRateLimits(
    [{ rule: RATE_RULES.placeAddPerUserMin, subject: userId }],
    "장소 추가 요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
  );
  const count = await prisma.placeEntry.count({ where: { tripId } });
  if (count >= TRIP_LIMITS.maxPlacesPerTrip) {
    throw new ForbiddenError(`여행 하나에 장소는 최대 ${TRIP_LIMITS.maxPlacesPerTrip}개까지 추가할 수 있습니다.`);
  }
}
