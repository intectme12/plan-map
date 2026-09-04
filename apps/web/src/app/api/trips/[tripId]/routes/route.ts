import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRoute } from "@/lib/services/routes";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId } = await params;
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "from, to 쿼리 파라미터가 필요합니다." }, { status: 400 });
    }

    const route = await getRoute(user.id, tripId, from, to);
    return NextResponse.json(route);
  } catch (err) {
    return handleRouteError(err);
  }
}
