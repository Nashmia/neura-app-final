/**
 * Check-in score trend: a least-squares regression line through recent scores, and a z-score check of
 * the latest score against the patient's own earlier ones. Plain statistics, no model or API call.
 * A tracking aid only: a few short check-ins are noisy, so nothing is reported before MIN_SESSIONS.
 */

export const MIN_SESSIONS = 5;
/** Fitted change across the window, in percentage points, before the trend counts as moving. */
const CHANGE_THRESHOLD = 10;
/** Floor for the standard deviation, so near-identical earlier scores don't make every small dip "unusual". */
const MIN_SD = 5;

export type ScoreTrend = {
  status: "improving" | "stable" | "declining";
  /** Fitted points per check-in. */
  slope: number;
  /** Fitted change from the first to the last check-in in the window, in points. */
  change: number;
  sessions: number;
  /** The regression line's value at each check-in, for drawing it. */
  fitted: number[];
  /** Latest score's z-score against the earlier ones; "unusually low" when it is -2 or below. */
  latestZ: number;
  latestUnusuallyLow: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** `scores` are percentages, oldest first. Returns null until there are MIN_SESSIONS of them. */
export function scoreTrend(scores: number[]): ScoreTrend | null {
  const n = scores.length;
  if (n < MIN_SESSIONS) return null;

  const meanX = (n - 1) / 2;
  const meanY = scores.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  scores.forEach((y, x) => {
    sxy += (x - meanX) * (y - meanY);
    sxx += (x - meanX) ** 2;
  });
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const change = slope * (n - 1);

  const earlier = scores.slice(0, -1);
  const earlierMean = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const sd = Math.sqrt(earlier.reduce((a, b) => a + (b - earlierMean) ** 2, 0) / (earlier.length - 1));
  const latestZ = (scores[n - 1] - earlierMean) / Math.max(sd, MIN_SD);

  return {
    status: change <= -CHANGE_THRESHOLD ? "declining" : change >= CHANGE_THRESHOLD ? "improving" : "stable",
    slope: round1(slope),
    change: round1(change),
    sessions: n,
    fitted: scores.map((_, x) => round1(intercept + slope * x)),
    latestZ: round1(latestZ),
    latestUnusuallyLow: latestZ <= -2,
  };
}
