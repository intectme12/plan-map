import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deletePlaceExpense } from "@/lib/services/expenses";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string; placeId: string; expenseId: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId, placeId, expenseId } = await params;
    await deletePlaceExpense(user.id, tripId, placeId, expenseId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
