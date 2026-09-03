import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addPhoto } from "@/lib/services/photos";
import { unauthorized, handleRouteError } from "@/lib/http";

type Context = { params: Promise<{ tripId: string; placeId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { tripId, placeId } = await params;
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    const photo = await addPhoto(user.id, tripId, placeId, file);
    return NextResponse.json(photo, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
