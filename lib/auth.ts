import "server-only";
import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { promisify } from "util";
import { getCollections, withoutMongoId } from "@/lib/db";
import type { User } from "@/lib/types";

const COOKIE_NAME = "neura_session";
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30;
const DEV_SECRET = "neura-development-secret-change-this";
const scrypt = promisify(crypto.scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** Read lazily so a missing AUTH_SECRET fails requests in production instead of silently using a public default. */
function secret() {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set.");
  return DEV_SECRET;
}

function hmac(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** scrypt with a per-password random salt, stored as `scrypt$<salt>$<hash>`. */
export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * Checks a password against a stored hash. Accounts created before the switch to scrypt
 * still hold the old SHA-256 hash; those verify here and are flagged for re-hashing.
 */
export async function verifyPassword(password: string, stored: string): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (stored.startsWith("scrypt$")) {
    const [, saltHex, hashHex] = stored.split("$");
    if (!saltHex || !hashHex) return { ok: false, needsRehash: false };
    const hash = await scrypt(password, Buffer.from(saltHex, "hex"), hashHex.length / 2);
    return { ok: safeEqual(hash.toString("hex"), hashHex), needsRehash: false };
  }
  const legacy = crypto.createHash("sha256").update(`${secret()}:${password}`).digest("hex");
  const ok = safeEqual(legacy, stored);
  return { ok, needsRehash: ok };
}

/** Random token for an emailed link; only its SHA-256 is stored, so a database leak can't be used to reset passwords. */
export function createResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Cookie value: `userId.sessionVersion.issuedAt.signature`. */
export function createSessionValue(userId: string, sessionVersion = 0) {
  const payload = `${userId}.${sessionVersion}.${Date.now()}`;
  return `${payload}.${hmac(payload)}`;
}

export function verifySessionValue(value?: string) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [userId, version, issuedAt, signature] = parts;
  if (!safeEqual(signature, hmac(`${userId}.${version}.${issuedAt}`))) return null;
  if (!(Date.now() - Number(issuedAt) <= SESSION_MAX_AGE_S * 1000)) return null;
  return { userId, sessionVersion: Number(version) };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = verifySessionValue(cookieStore.get(COOKIE_NAME)?.value);
  if (!session) return null;
  const { users } = await getCollections();
  const user = await users.findOne({ id: session.userId }, withoutMongoId);
  // A password reset bumps sessionVersion, which signs out every older session.
  if (!user || (user.sessionVersion ?? 0) !== session.sessionVersion) return null;
  return user;
}

/** `remember: false` sets a browser-session cookie that is dropped when the browser closes. */
export async function setSession(user: Pick<User, "id" | "sessionVersion">, remember = true) {
  const cookieStore = await cookies();
  // Secure-only over HTTPS (always the case on Vercel). Safari drops secure cookies on plain
  // http://, so a production build opened over http (e.g. from a phone on the LAN) would never log in.
  const secure = (await headers()).get("x-forwarded-proto")?.split(",")[0].trim() === "https";
  cookieStore.set(COOKIE_NAME, createSessionValue(user.id, user.sessionVersion ?? 0), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    ...(remember ? { maxAge: SESSION_MAX_AGE_S } : {}),
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // invite links expire after 7 days

export function createInviteCode(patientId: string) {
  const payload = `${patientId}.${Date.now()}`;
  const signature = hmac(payload);
  return `${payload}.${signature}`;
}

/** Returns the patientId encoded in the code, or null if it's missing, forged, or expired. */
export function verifyInviteCode(code?: string | null): string | null {
  if (!code) return null;
  const parts = code.split(".");
  if (parts.length !== 3) return null;
  const [patientId, timestamp, signature] = parts;
  const payload = `${patientId}.${timestamp}`;
  const expected = hmac(payload);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  if (!Number.isFinite(Number(timestamp)) || Date.now() - Number(timestamp) > INVITE_TTL_MS) return null;
  return patientId;
}
