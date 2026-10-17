import { incrementCounter } from "@/lib/db";

/**
 * Per-user limits on the AI routes, to protect the shared Gemini free-tier quota (about 20 generation
 * requests a day on the main model, plus the fallback model's own quota) from one heavy user.
 * Fixed windows; counters live in the database so they hold across Vercel serverless instances.
 */
type Window = { name: string; max: number; windowMs: number; message: (wait: string) => string };

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const RATE_LIMITS = {
  // One question = one generation request.
  assistant: [
    { name: "10min", max: 6, windowMs: 10 * MINUTE, message: (w) => `You've sent several questions in a short time. Please wait ${w} and try again.` },
    { name: "day", max: 30, windowMs: DAY, message: (w) => `You've reached today's limit of 30 Care Assistant questions. It resets in ${w}.` },
  ],
  // An 8-question check-in uses 9 turns (start + 8 answers).
  quizTurn: [
    { name: "10min", max: 12, windowMs: 10 * MINUTE, message: (w) => `That's a lot of check-in messages in a short time. Please wait ${w} and try again.` },
  ],
  quizStart: [
    { name: "day", max: 3, windowMs: DAY, message: (w) => `You've already started 3 check-ins today. A new one can be started in ${w}.` },
  ],
} satisfies Record<string, Window[]>;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number; message: string };

function describeWait(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / MINUTE));
  if (minutes < 60) return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `about ${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Counts one request against each window, shortest first, and stops at the first window that is over
 * its limit (so a request refused for a burst doesn't also use up the daily allowance).
 */
export async function checkRateLimit(userId: string, scope: keyof typeof RATE_LIMITS, now = Date.now()): Promise<RateLimitResult> {
  for (const limit of RATE_LIMITS[scope] as Window[]) {
    const windowStart = Math.floor(now / limit.windowMs) * limit.windowMs;
    const resetAt = windowStart + limit.windowMs;
    const count = await incrementCounter(`${scope}:${userId}:${limit.name}:${windowStart}`, new Date(resetAt));
    if (count > limit.max) {
      return { ok: false, retryAfterSeconds: Math.ceil((resetAt - now) / 1000), message: limit.message(describeWait(resetAt - now)) };
    }
  }
  return { ok: true };
}
