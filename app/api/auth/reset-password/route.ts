import { NextResponse } from "next/server";
import { z } from "zod";
import { findPatientForUser, getCollections, withoutMongoId } from "@/lib/db";
import { hashPassword, hashResetToken, setSession } from "@/lib/auth";

/**
 * Step 2 of a password reset: the emailed token plus a new password. The token works once,
 * and the reset signs out every other device that was logged in to the account.
 */

const schema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/),
  password: z.string().min(6),
});

const INVALID = "This reset link is invalid or has expired. Please request a new one.";

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const badToken = parsed.error.issues.some((issue) => issue.path[0] === "token");
    return NextResponse.json({ error: badToken ? INVALID : "Password must be at least 6 characters." }, { status: 400 });
  }

  const collections = await getCollections();
  const user = await collections.users.findOne({ resetTokenHash: hashResetToken(parsed.data.token) }, withoutMongoId);
  if (!user || !user.resetTokenExpires || Date.parse(user.resetTokenExpires) < Date.now()) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  const sessionVersion = (user.sessionVersion ?? 0) + 1;
  await collections.users.updateOne(
    { id: user.id },
    {
      $set: {
        passwordHash: await hashPassword(parsed.data.password),
        sessionVersion,
        resetTokenHash: "",
        resetTokenExpires: "",
        loginFailures: 0,
        loginLockedUntil: "",
      },
    }
  );

  await setSession({ id: user.id, sessionVersion });
  const patient = await findPatientForUser(collections, user.id);
  return NextResponse.json({ ok: true, hasPatient: Boolean(patient) });
}
