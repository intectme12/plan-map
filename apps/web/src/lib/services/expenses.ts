import { prisma } from "../db";
import { NotFoundError } from "../errors";

async function assertPlaceOwnership(userId: string, tripId: string, placeId: string) {
  const place = await prisma.placeEntry.findFirst({
    where: { id: placeId, tripId, trip: { userId } },
    select: { id: true },
  });
  if (!place) throw new NotFoundError("장소를 찾을 수 없습니다.");
}

// 장소 카드에서 인라인으로 입력하는 대표 지출 1건을 즉시저장 방식(upsert)으로 관리한다.
export async function setPlaceExpense(userId: string, tripId: string, placeId: string, amount: number) {
  await assertPlaceOwnership(userId, tripId, placeId);

  const existing = await prisma.expense.findFirst({ where: { placeEntryId: placeId } });
  if (existing) {
    return prisma.expense.update({ where: { id: existing.id }, data: { amount } });
  }
  return prisma.expense.create({ data: { placeEntryId: placeId, amount, source: "manual" } });
}
