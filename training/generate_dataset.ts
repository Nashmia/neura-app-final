/**
 * Generates a synthetic instruction-tuning dataset for fine-tuning the
 * Care Assistant model, by turning each curated knowledge-base article into
 * several realistic caregiver Q&A pairs (via Gemini), plus a hand-written
 * set of "boundary" examples teaching the model to decline medical
 * diagnosis / dosage questions and defer to a doctor instead.
 *
 * Output: training/dataset.jsonl — one JSON chat example per line, in the
 * {messages:[{role,content}, ...]} format used by most SFT training tools.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { knowledgeBase, type KnowledgeArticle } from "../scripts/knowledge-base";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env.local");
const ai = new GoogleGenAI({ apiKey });

const PAIRS_PER_ARTICLE = 6;

const qaSchema = {
  type: Type.OBJECT,
  properties: {
    pairs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          answer: { type: Type.STRING },
        },
        required: ["question", "answer"],
      },
    },
  },
  required: ["pairs"],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The free Gemini tier allows very few requests per minute; retry with backoff on 429s. */
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status !== 429 || attempt === maxAttempts) throw error;
      const waitMs = 20_000 * attempt;
      console.log(`  Rate limited, waiting ${waitMs / 1000}s before retry ${attempt}/${maxAttempts - 1}...`);
      await sleep(waitMs);
    }
  }
  throw new Error("unreachable");
}

async function generatePairsForArticle(article: KnowledgeArticle) {
  const prompt = `You are creating training examples for an AI dementia-care assistant. Based ONLY on the article below, write ${PAIRS_PER_ARTICLE} distinct, realistic questions a family caregiver might ask, each with a warm, concise, practical answer grounded strictly in this article's content. Vary the phrasing and angle of the questions (direct, worried, seeking a first step, etc). Do not invent facts not supported by the article.

Title: ${article.title}
Article:
${article.text}`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", responseSchema: qaSchema, temperature: 0.8 },
    })
  );

  const text = response.text;
  if (!text) throw new Error(`Empty response for article ${article.source}`);
  const parsed = JSON.parse(text) as { pairs: { question: string; answer: string }[] };
  return parsed.pairs;
}

const SYSTEM_PROMPT =
  "You are Neura's Care Assistant, a supportive AI for caregivers of dementia patients. Answer warmly, concisely, and practically, grounded in general dementia-caregiving best practice. Never provide a medical diagnosis or tell a caregiver to change a medication dose — for medical decisions, recommend contacting the patient's doctor.";

// Hand-authored boundary/safety examples — teach the model to decline
// requests it shouldn't answer directly, matching the RAG assistant's rules.
const boundaryExamples: { question: string; answer: string }[] = [
  {
    question: "Should I increase my mom's donepezil dose since she seems more confused lately?",
    answer:
      "I can't advise changing a medication dose — that needs to go through her prescribing doctor. Increased confusion can have several causes, including infections, so it's worth calling her doctor's office to describe what you're seeing rather than adjusting the dose yourself.",
  },
  {
    question: "Does my dad have Alzheimer's or vascular dementia?",
    answer:
      "I'm not able to diagnose a specific type of dementia — that requires a doctor's evaluation, often including cognitive testing and imaging. If he hasn't already been evaluated by a neurologist or memory clinic, that would be the right next step.",
  },
  {
    question: "Is it safe to give her double the sleeping pill dose tonight since she's been so restless?",
    answer:
      "Please don't change a dose on your own, especially doubling one — that can be dangerous. If restlessness or sleep problems are becoming a regular issue, call her doctor to discuss it; there may be a safer adjustment or a non-medication approach that helps.",
  },
  {
    question: "How many months does he have left?",
    answer:
      "That's a really hard question, and honestly not one I can answer — prognosis varies a lot and is something his doctor or a palliative care team is best placed to discuss with you, especially if you're starting to think about end-of-life planning.",
  },
  {
    question: "Can you diagnose why she's suddenly much more confused today?",
    answer:
      "A sudden, sharp increase in confusion is worth a call to her doctor promptly — it can sometimes be caused by something treatable like a urinary tract infection or dehydration rather than the dementia progressing. I can't diagnose it, but I wouldn't wait to get it checked.",
  },
  {
    question: "What medication should I ask the doctor to prescribe for his aggression?",
    answer:
      "I can't recommend specific medications — that's a decision for his doctor based on a full picture of his health. What I can do is help you describe the pattern of aggression (what triggers it, when it happens, how long it lasts) clearly, which will help the doctor make a better-informed recommendation.",
  },
  {
    question: "Is it okay to stop her blood pressure medication since she keeps refusing to take it?",
    answer:
      "Please don't stop a prescribed medication without checking with her doctor first, even if she's refusing it — stopping some medications abruptly can be risky. It's worth calling the doctor's office to ask about alternatives, like a different formulation, or strategies for medication refusal.",
  },
  {
    question: "Can you tell me if this rash is a side effect of his medication?",
    answer:
      "I'm not able to assess a rash or other physical symptom — that needs a doctor or pharmacist to look at directly, especially since it could be a medication reaction that needs prompt attention. It's worth calling his doctor's office today to describe it.",
  },
];

type ChatExample = { messages: { role: string; content: string }[] };

function toExample(question: string, answer: string): ChatExample {
  return {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question },
      { role: "assistant", content: answer },
    ],
  };
}

// Caches per-article results to disk so a rate-limit failure partway through
// doesn't waste the calls already made — reruns pick up where they left off.
const cachePath = path.join(__dirname, ".dataset-cache.json");
type Cache = Record<string, { question: string; answer: string }[]>;

function loadCache(): Cache {
  if (!existsSync(cachePath)) return {};
  return JSON.parse(readFileSync(cachePath, "utf8")) as Cache;
}

function saveCache(cache: Cache) {
  writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf8");
}

// Free-tier Gemini allows only ~5 requests/minute — space calls out to stay under that.
const DELAY_BETWEEN_CALLS_MS = 13_000;

async function main() {
  const examples: ChatExample[] = [];
  const cache = loadCache();

  for (const article of knowledgeBase) {
    if (cache[article.source]) {
      console.log(`Skipping (cached): ${article.title}`);
    } else {
      console.log(`Generating Q&A for: ${article.title}`);
      cache[article.source] = await generatePairsForArticle(article);
      saveCache(cache);
      await sleep(DELAY_BETWEEN_CALLS_MS);
    }
    for (const pair of cache[article.source]) examples.push(toExample(pair.question, pair.answer));
  }

  for (const example of boundaryExamples) examples.push(toExample(example.question, example.answer));

  // Shuffle so the model doesn't see all examples for one topic in a row.
  for (let i = examples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [examples[i], examples[j]] = [examples[j], examples[i]];
  }

  const outPath = path.join(__dirname, "dataset.jsonl");
  const lines = examples.map((e) => JSON.stringify(e)).join("\n");
  writeFileSync(outPath, lines, "utf8");
  console.log(`\nWrote ${examples.length} training examples to ${outPath}`);
}

main().catch((error) => {
  console.error("Failed to generate dataset:", error);
  process.exit(1);
});
