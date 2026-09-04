import { prisma } from "../db";
import { NotFoundError } from "../errors";

async function assertPlaceOwnership(userId: string, tripId: string, placeId: string) {
  const place = await prisma.placeEntry.findFirst({
    where: { id: placeId, tripId, trip: { userId } },
    select: { id: true },
  });
  if (!place) throw new NotFoundError("장소를 찾을 수 없습니다.");
}

export async function addPlaceExpense(
  userId: string,
  tripId: string,
  placeId: string,
  data: { category: string; amount: number; memo?: string }
) {
  await assertPlaceOwnership(userId, tripId, placeId);
  return prisma.expense.create({ data: { placeEntryId: placeId, source: "manual", ...data } });
}

export async function deletePlaceExpense(
  userId: string,
  tripId: string,
  placeId: string,
  expenseId: string
) {
  await assertPlaceOwnership(userId, tripId, placeId);
  const result = await prisma.expense.deleteMany({ where: { id: expenseId, placeEntryId: placeId } });
  if (result.count === 0) throw new NotFoundError("지출 내역을 찾을 수 없습니다.");
}
