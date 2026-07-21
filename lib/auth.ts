import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getCollections, withoutMongoId } from "@/lib/db";

const COOKIE_NAME = "neura_session";
const SECRET = process.env.AUTH_SECRET || "neura-development-secret-change-this";

export function hashPassword(password: string) {
  return crypto.createHash("sha256").update(`${SECRET}:${password}`).digest("hex");
}

export function createSessionValue(userId: string) {
  const signature = crypto.createHmac("sha256", SECRET).update(userId).digest("hex");
  return `${userId}.${signature}`;
}

export function verifySessionValue(value?: string) {
  if (!value) return null;
  const [userId, signature] = value.split(".");
  if (!userId || !signature) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(userId).digest("hex");
  if (signature.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? userId : null;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = verifySessionValue(cookieStore.get(COOKIE_NAME)?.value);
  if (!userId) return null;
  const { users } = await getCollections();
  return users.findOne({ id: userId }, withoutMongoId);
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionValue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
