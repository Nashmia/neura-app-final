import "server-only";
import { GoogleGenAI, Type } from "@google/genai";

const QUIZ_MODEL = "gemini-flash-latest";
const ASSISTANT_MODEL = "gemini-flash-latest";

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

export type HistoryTurn = { role: "user" | "model"; text: string };

export type QuizTurn =
  | { type: "question"; message: string; questionNumber: number; total: number }
  | { type: "complete"; message: string; score: number; total: number; summary: string };

const quizResponseSchema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ["question", "complete"] },
    message: { type: Type.STRING },
    questionNumber: { type: Type.INTEGER },
    total: { type: Type.INTEGER },
    score: { type: Type.INTEGER },
    summary: { type: Type.STRING },
  },
  required: ["type", "message", "total"],
};

export async function runQuizTurn(systemInstruction: string, history: HistoryTurn[]): Promise<QuizTurn> {
  const ai = getClient();
  const contents = history.length ? history : [{ role: "user" as const, text: "Please begin the check-in." }];

  const response = await ai.models.generateContent({
    model: QUIZ_MODEL,
    contents: contents.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: quizResponseSchema,
      temperature: 0.6,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini.");
  return JSON.parse(text) as QuizTurn;
}

export async function runAssistantTurn(systemInstruction: string, history: HistoryTurn[]): Promise<string> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: ASSISTANT_MODEL,
    contents: history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    config: {
      systemInstruction,
      temperature: 0.4,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini.");
  return text;
}
