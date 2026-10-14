import "server-only";
import nodemailer from "nodemailer";

/**
 * Outgoing email over SMTP. With Gmail: SMTP_USER is the Gmail address and SMTP_PASS is an
 * App Password (Google Account > Security > 2-Step Verification > App passwords).
 * Without SMTP settings in development, emails are printed to the server console instead.
 */

export function emailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP_USER / SMTP_PASS are not set.");
    console.log(`\n[email not configured — would send]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transport.sendMail({
    from: process.env.EMAIL_FROM || `Neura <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

/**
 * Base URL for links in emails. Never taken from the request's Host header in production,
 * since a forged header would make reset links point at an attacker's site.
 */
export function appUrl(request: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.NODE_ENV === "production") throw new Error("APP_URL is not set.");
  return new URL(request.url).origin;
}
