import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addPlaceExpense } from "@/lib/services/expenses";
import { createExpenseSchema } from "@/lib/validation";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string; placeId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId, placeId } = await params;
    const body = await request.json().catch(() => null);
    const data = createExpenseSchema.parse(body);
    const expense = await addPlaceExpense(user.id, tripId, placeId, data);
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
