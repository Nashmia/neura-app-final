/**
 * Counts every HTTP request the Gemini SDK makes, including retries and quota-fallback calls hidden
 * inside lib/gemini.ts, by wrapping globalThis.fetch for this process only. Install it BEFORE importing
 * anything that loads @google/genai.
 *
 * Only the model name, method (embedContent / generateContent) and HTTP status are recorded — never the
 * URL, headers or body, so no API key can end up in the report. `redact()` additionally scrubs any
 * environment-variable value from strings before they are printed or saved.
 */

export type ApiCall = { at: string; method: string; model: string; status: number | "network-error"; ms: number; phase: string };

export const apiCalls: ApiCall[] = [];
let currentPhase = "setup";
export const setPhase = (phase: string) => { currentPhase = phase; };

export function installFetchCounter() {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const match = /generativelanguage\.googleapis\.com\/[^/]+\/models\/([^:/?]+):([A-Za-z]+)/.exec(url);
    if (!match) return original(input, init);
    const started = performance.now();
    try {
      const response = await original(input, init);
      apiCalls.push({ at: new Date().toISOString(), model: match[1], method: match[2], status: response.status, ms: Math.round(performance.now() - started), phase: currentPhase });
      return response;
    } catch (error) {
      apiCalls.push({ at: new Date().toISOString(), model: match[1], method: match[2], status: "network-error", ms: Math.round(performance.now() - started), phase: currentPhase });
      throw error;
    }
  }) as typeof fetch;
}

export function summariseCalls() {
  const by = (pred: (c: ApiCall) => boolean) => apiCalls.filter(pred).length;
  const models = [...new Set(apiCalls.map((c) => `${c.method} · ${c.model}`))];
  return {
    total: apiCalls.length,
    embedding: by((c) => c.method === "embedContent" || c.method === "batchEmbedContents"),
    generation: by((c) => c.method === "generateContent" || c.method === "streamGenerateContent"),
    failedHttp: by((c) => c.status !== 200),
    byPhase: Object.fromEntries([...new Set(apiCalls.map((c) => c.phase))].map((p) => [p, by((c) => c.phase === p)])),
    byMethodAndModel: Object.fromEntries(models.map((m) => [m, by((c) => `${c.method} · ${c.model}`  === m)])),
  };
}

const SENSITIVE_ENV = /(KEY|SECRET|TOKEN|PASS|URI|URL|USER|OIDC)/i;

/** Replaces the value of any secret-looking environment variable found in `text` with [redacted]. */
export function redact(text: string): string {
  let out = text;
  for (const [name, value] of Object.entries(process.env)) {
    if (SENSITIVE_ENV.test(name) && value && value.length >= 6 && out.includes(value)) out = out.split(value).join("[redacted]");
  }
  return out.replace(/mongodb(\+srv)?:\/\/[^\s"']+/g, "mongodb://[redacted]").replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]");
}
