import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/betterAuth";

export async function POST() {
  await auth.api.signOut({ headers: await headers() });
  return NextResponse.json({ ok: true });
}
