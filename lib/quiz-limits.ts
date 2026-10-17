/**
 * Allowed cognitive check-in length, shared by onboarding (client + server) and the quiz route.
 * 3–8 keeps a check-in short enough not to tire someone with dementia, and each question costs one
 * Gemini generation request from a small free-tier daily quota.
 */
export const QUIZ_MIN_QUESTIONS = 3;
export const QUIZ_MAX_QUESTIONS = 8;
export const QUIZ_DEFAULT_QUESTIONS = 5;
export const QUIZ_MAX_ANSWER_CHARS = 500;

export function clampQuizLength(value: number | undefined) {
  const n = Math.round(Number(value) || QUIZ_DEFAULT_QUESTIONS);
  return Math.min(Math.max(n, QUIZ_MIN_QUESTIONS), QUIZ_MAX_QUESTIONS);
}
