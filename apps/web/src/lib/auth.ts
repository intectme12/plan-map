import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET 환경변수가 설정되어 있지 않습니다.");
}

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSession(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET as string, { expiresIn: "30d" });
}

function verifySession(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = verifySession(token);
  if (!userId) return null;

  return prisma.user.findUnique({ where: { id: userId } });
}

export function isAdmin(user: { role: string } | null | undefined) {
  return user?.role === "ADMIN";
}
