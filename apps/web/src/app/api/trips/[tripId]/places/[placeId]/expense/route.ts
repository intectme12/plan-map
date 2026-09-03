import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { setPlaceExpense } from "@/lib/services/expenses";
import { expenseAmountSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string; placeId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId, placeId } = await params;
    const body = await request.json().catch(() => null);
    const { amount } = expenseAmountSchema.parse(body);
    const expense = await setPlaceExpense(user.id, tripId, placeId, amount);
    return NextResponse.json(expense);
  } catch (err) {
    return handleRouteError(err);
  }
}
