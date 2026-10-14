import { NextResponse } from "next/server";
import { z } from "zod";
import { getCollections, withoutMongoId } from "@/lib/db";
import { createResetToken } from "@/lib/auth";
import { appUrl, emailConfigured, sendEmail } from "@/lib/email";

/**
 * Step 1 of a password reset: email a one-time link to the account's address.
 * The response is the same whether or not the email has an account, so this
 * can't be used to find out who is registered.
 */

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

const TOKEN_TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const SENT = "If an account exists for that email, we've sent a link to reset your password. It expires in 30 minutes.";

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  if (process.env.NODE_ENV === "production" && !emailConfigured()) {
    console.error("Password reset requested but SMTP_USER / SMTP_PASS are not set.");
    return NextResponse.json({ error: "Password reset by email isn't available right now. Please try again later." }, { status: 503 });
  }

  const collections = await getCollections();
  const user = await collections.users.findOne({ email: parsed.data.email }, withoutMongoId);
  if (!user) return NextResponse.json({ message: SENT });

  // Stops the form being used to flood someone's inbox.
  if (user.resetRequestedAt && Date.now() - Date.parse(user.resetRequestedAt) < RESEND_COOLDOWN_MS) {
    return NextResponse.json({ message: SENT });
  }

  const { token, tokenHash } = createResetToken();
  await collections.users.updateOne(
    { id: user.id },
    { $set: { resetTokenHash: tokenHash, resetTokenExpires: new Date(Date.now() + TOKEN_TTL_MS).toISOString(), resetRequestedAt: new Date().toISOString() } }
  );

  const link = `${appUrl(request)}/reset-password?token=${token}`;
  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your Neura password",
      text: `Hi ${user.name},\n\nSomeone asked to reset the password for your Neura account. Open this link to choose a new one:\n\n${link}\n\nThe link expires in 30 minutes and can be used once. If you didn't ask for this, you can ignore this email and your password stays the same.\n\n— Neura`,
      html: `<p>Hi ${escapeHtml(user.name)},</p><p>Someone asked to reset the password for your Neura account. Click below to choose a new one:</p><p><a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600">Reset password</a></p><p style="color:#64748b;font-size:14px">The link expires in 30 minutes and can be used once. If you didn't ask for this, you can ignore this email and your password stays the same.</p>`,
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return NextResponse.json({ error: "We couldn't send the email. Please try again in a minute." }, { status: 502 });
  }

  return NextResponse.json({ message: SENT });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
