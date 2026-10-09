import "server-only";
import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "gemini-embedding-001";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (local) and to your Vercel project's Environment Variables (production)."
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export async function embedText(text: string): Promise<number[]> {
  const ai = getClient();
  const response = await ai.models.embedContent({ model: EMBEDDING_MODEL, contents: text });
  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error("Gemini returned no embedding for the given text.");
  return values;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
