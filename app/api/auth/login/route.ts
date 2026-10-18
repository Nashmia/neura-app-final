import { NextResponse } from "next/server";
import { z } from "zod";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";
import { hashPassword, setSession, verifyPassword } from "@/lib/auth";
import { safeNextPath } from "@/lib/access";

// Lock an account's login for a while after this many wrong passwords in a row.
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
  remember: z.union([z.boolean(), z.literal("on")]).optional(),
  next: z.string().optional(),
});

export async function POST(request: Request) {
  // The login form also works before the page's JavaScript has loaded: the browser then
  // posts it as a regular form, and we answer with redirects instead of JSON.
  const isFormPost = !(request.headers.get("content-type") || "").includes("application/json");
  const body = isFormPost
    ? Object.fromEntries(await request.formData().catch(() => new FormData()))
    : await request.json().catch(() => ({}));

  const fail = (error: string, status: number) =>
    isFormPost
      ? NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url), 303)
      : NextResponse.json({ error }, { status });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Enter a valid email and a password of at least 6 characters.", 400);

  const collections = await getCollections();
  const user = await collections.users.findOne({ email: parsed.data.email }, withoutMongoId);
  if (!user) {
    // Same scrypt cost as a real check, so response time doesn't reveal which emails are registered.
    await hashPassword(parsed.data.password);
    return fail("Email or password is incorrect.", 401);
  }

  if (user.loginLockedUntil && Date.parse(user.loginLockedUntil) > Date.now()) {
    return fail("Too many failed attempts. Please wait 15 minutes or reset your password.", 429);
  }

  const { ok, needsRehash } = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    const failures = (user.loginFailures ?? 0) + 1;
    await collections.users.updateOne(
      { id: user.id },
      { $set: failures >= MAX_FAILURES ? { loginFailures: 0, loginLockedUntil: new Date(Date.now() + LOCK_MS).toISOString() } : { loginFailures: failures } }
    );
    return fail("Email or password is incorrect.", 401);
  }

  // Clear the failure count, and move pre-scrypt accounts onto the new hash now that we know the password.
  if (needsRehash || user.loginFailures || user.loginLockedUntil) {
    await collections.users.updateOne(
      { id: user.id },
      { $set: { loginFailures: 0, loginLockedUntil: "", ...(needsRehash ? { passwordHash: await hashPassword(parsed.data.password) } : {}) } }
    );
  }

  await setSession(user, parsed.data.remember !== false);
  const patient = await findPatientForUser(collections, user.id);
  if (isFormPost) return NextResponse.redirect(new URL(safeNextPath(parsed.data.next) ?? (patient ? "/dashboard" : "/onboarding"), request.url), 303);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone }, hasPatient: Boolean(patient) });
}
