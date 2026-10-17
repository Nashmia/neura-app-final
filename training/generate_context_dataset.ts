/**
 * Phase 4 — context-conditioned training data for the fine-tuned Care Assistant model.
 *
 * Problem it fixes: the first fine-tune was trained on short, context-free prompts (a one-line system
 * prompt and a question), but production sends a long RAG prompt — numbered knowledge-base excerpts,
 * the patient's care data, citation and safety rules. The Phase 4 benchmark showed the result: no
 * citations, one-sentence answers, and invented patient facts.
 *
 * Every example here is built with the PRODUCTION prompt code (lib/assistant-context.ts), so training
 * input = serving input:
 *   - knowledge questions (from training/dataset.jsonl) with the dense top 3 articles — usually the right
 *     one plus distractors; ~15% get only distractors (ranks 6-8) to teach "the guidance doesn't cover it";
 *   - patient-record questions over synthetic patients (moods, medications, appointments, check-ins, dates);
 *   - questions Neura cannot answer (no record), and safety questions (dose changes, diagnosis);
 *   - half of the non-knowledge questions get no articles (as the reranker sends none), half get 3 distractors.
 * Target answers come from a Gemini "teacher" given the same prompt, then pass automatic quality filters.
 * Questions resembling any evaluation question are removed (no test leakage), and the synthetic patients
 * are different from the evaluation fixture.
 *
 * Usage:
 *   npm run gen:context-dataset -- --dry-run          build prompts only; no generation calls
 *   npm run gen:context-dataset -- --max-new=60       generate up to 60 new teacher answers this run
 * Options: --teacher=MODEL (default gemini-3.8-flash), --delay=MS (default 4500), --kb=local|mongo.
 * Progress is cached in training/.context-dataset-cache.json, so reruns continue where they stopped;
 * a quota error (429) stops the run cleanly. Outputs: training/context_dataset.{train,val}.jsonl,
 * training/context_dataset.rejected.jsonl and training/context_dataset.stats.json.
 */
import { config } from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

config({ path: join(__dirname, "..", ".env.local"), quiet: true });

const arg = (name: string) => process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const argValue = (name: string, fallback: string) => arg(name)?.split("=")[1] ?? fallback;
const flags = {
  dryRun: Boolean(arg("dry-run")),
  maxNew: Number(argValue("max-new", "60")),
  teacher: argValue("teacher", "gemini-3.8-flash"),
  delayMs: Number(argValue("delay", "4500")),
  kb: argValue("kb", "local"),
};

const DIR = __dirname;
const CACHE_PATH = join(DIR, ".context-dataset-cache.json");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- deterministic randomness (reproducible dataset) ---------- */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261017);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ---------- synthetic patients (different from evaluation/fixtures) ---------- */
type Med = { id: string; userId: string; patientId: string; name: string; dosage: string; time: string; status: "Taken" | "Pending" };
type Patient = {
  id: string; name: string; age: number; dementiaStage: string; now: string; pronoun: "she" | "he";
  medications: Med[];
  sessions: { id: string; userId: string; patientId: string; score: number; total: number; createdAt: string }[];
  journalEntries: { id: string; userId: string; patientId: string; text: string; moodTag?: "Calm" | "Anxious" | "Confused" | "Happy" | "Tired"; createdAt: string }[];
  appointments: { id: string; userId: string; patientId: string; title: string; type: "Doctor" | "Therapy" | "Other"; date: string; time: string; status: "Upcoming" | "Cancelled"; createdAt: string }[];
};

const MED_POOL: [string, string, string][] = [
  ["Donepezil", "5mg", "08:00 AM"], ["Donepezil", "10mg", "09:00 PM"], ["Memantine", "10mg", "08:00 AM"], ["Rivastigmine", "4.6mg patch", "09:00 AM"],
  ["Sertraline", "50mg", "09:00 AM"], ["Amlodipine", "5mg", "08:00 AM"], ["Metformin", "500mg", "07:30 PM"], ["Vitamin D", "1000 IU", "12:00 PM"],
  ["Galantamine", "8mg", "08:00 AM"], ["Atorvastatin", "20mg", "10:00 PM"],
];
const NOTES: [string, Patient["journalEntries"][number]["moodTag"]][] = [
  ["Restless in the evening and kept asking to go home.", "Anxious"], ["Enjoyed a short walk in the park after lunch.", "Calm"],
  ["Didn't recognise the neighbour this morning.", "Confused"], ["Laughed a lot while looking at wedding photos.", "Happy"],
  ["Slept most of the afternoon.", "Tired"], ["Refused to shower; calmer after some music.", "Anxious"], ["Helped fold the laundry and seemed proud.", "Happy"],
  ["Woke up at 3am looking for the car keys.", "Confused"], ["Ate a full breakfast for the first time this week.", "Calm"], ["Got upset when the TV was too loud.", "Anxious"],
  ["Called me by her sister's name twice.", "Confused"], ["Sang along to old songs on the radio.", "Happy"], ["", "Tired"], ["Quiet day, watched the birds from the window.", "Calm"],
];
const APPTS: [string, Patient["appointments"][number]["type"]][] = [
  ["Memory clinic review", "Doctor"], ["GP check-up", "Doctor"], ["Occupational therapy", "Therapy"], ["Eye test", "Other"], ["Hearing aid fitting", "Other"], ["Geriatrician follow-up", "Doctor"],
];
const PEOPLE: [string, number, string, "she" | "he"][] = [
  ["Margaret Hale", 81, "Mild", "she"], ["Arthur Pennington", 76, "Moderate", "he"], ["Farida Qureshi", 72, "Mild", "she"],
  ["Thomas Okafor", 84, "Moderate", "he"], ["Rosa Delgado", 79, "Severe", "she"], ["Imran Siddiqui", 74, "Mild", "he"],
];
const NOW_DATES = ["2026-09-12", "2026-09-26", "2026-10-03", "2026-10-09", "2026-10-21", "2026-11-04"];

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: string, days: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return ymd(d); };

function makePatient(i: number): Patient {
  const [name, age, dementiaStage, pronoun] = PEOPLE[i];
  const now = NOW_DATES[i];
  const id = `train-patient-${i + 1}`;
  const base = { userId: "train-user", patientId: id };
  const meds = shuffle(MED_POOL).slice(0, 2 + Math.floor(rand() * 3));
  const seenMeds = new Set<string>();
  const medications: Med[] = meds.filter(([n]) => !seenMeds.has(n) && seenMeds.add(n)).map(([n, dosage, time], k) => ({ ...base, id: `${id}-m${k}`, name: n, dosage, time, status: rand() < 0.5 ? "Taken" : "Pending" }));
  const journalEntries = shuffle(NOTES).slice(0, 8 + Math.floor(rand() * 5)).map(([text, moodTag], k) => ({
    ...base, id: `${id}-j${k}`, text, moodTag, createdAt: `${addDays(now, -(k * 2 + Math.floor(rand() * 2)))}T${String(9 + Math.floor(rand() * 11)).padStart(2, "0")}:00:00.000Z`,
  }));
  const nSessions = 2 + Math.floor(rand() * 5);
  const sessions = Array.from({ length: nSessions }, (_, k) => {
    const total = pick([3, 4, 5, 5, 6]);
    return { ...base, id: `${id}-s${k}`, score: Math.max(0, Math.min(total, Math.round(total * (0.3 + rand() * 0.6)))), total, createdAt: `${addDays(now, -7 * (nSessions - k))}T10:00:00.000Z` };
  });
  const appointments = shuffle(APPTS).slice(0, 3).map(([title, type], k) => ({
    ...base, id: `${id}-a${k}`, title, type, time: pick(["09:30", "11:00", "14:15", "16:00"]),
    // One past appointment still marked Upcoming (the app must not present it as upcoming), one cancelled, one future.
    date: k === 0 ? addDays(now, -5) : addDays(now, 4 + Math.floor(rand() * 20)),
    status: (k === 2 ? "Cancelled" : "Upcoming") as "Upcoming" | "Cancelled",
    createdAt: `${addDays(now, -30)}T10:00:00.000Z`,
  }));
  return { id, name, age, dementiaStage, now, pronoun, medications, sessions, journalEntries, appointments };
}

/* ---------- questions ---------- */
type Kind = "knowledge" | "knowledge-distractors" | "patient" | "insufficient" | "safety";
type Example = { id: string; kind: Kind; question: string; patient: number; articleMode: "top3" | "distractors" | "none" };

const PATIENT_QUESTIONS = (p: Patient) => {
  const her = p.pronoun === "she" ? "her" : "his";
  const they = p.pronoun;
  const someDay = p.journalEntries[Math.min(6, p.journalEntries.length - 1)].createdAt.slice(0, 10);
  const [, m, d] = someDay.split("-").map(Number);
  const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1];
  return [
    `How has ${her} mood been this week?`, `Has ${they} seemed calmer or more anxious lately?`, `What medications is ${they} taking and which doses are still pending?`,
    `Did ${they} take ${her} morning tablets today?`, `When is ${her} next appointment?`, `What appointments are coming up for ${her}?`,
    `What was ${her} latest check-in score?`, `Has ${her} check-in score improved since ${her} first check-in?`, `How did ${they} do in the check-ins over the past few weeks?`,
    `What did I write about ${her} on the ${d}th of ${month}?`, `Was there anything that seemed to cheer ${her} up recently?`, `How was ${they} yesterday?`,
    `Give me a quick summary of how ${they}'s been doing.`, `Is ${her} memory getting worse based on the check-ins?`,
  ];
};
const INSUFFICIENT = [
  "What did the doctor say at the last appointment?", "What were the blood test results?", "What is her blood pressure usually?", "How many hours did he sleep last night?",
  "Which medication was he on last year?", "What's her weight now?", "Did the physiotherapist say anything about his balance?", "What did she eat for lunch yesterday?",
  "What is his MRI result?", "How much water did she drink today?", "Who visited him last weekend?", "What was the dentist's advice?",
  "What's his cholesterol level?", "Did the nurse change her dressing this morning?", "How many steps did he walk today?", "What did the social worker recommend?",
  "When did she last have a flu jab?", "What allergies does he have?", "What was her temperature this morning?", "Which hospital was he treated at before?",
];
const SAFETY = [
  "Should I double her Donepezil if she seems more confused?", "Can I stop his memantine since it's not helping?", "Is it okay to give her a sleeping pill so she stops wandering at night?",
  "Does she have Alzheimer's or vascular dementia?", "Can I crush his tablets into his food without telling the doctor?", "She skipped her morning dose, should I give two tonight?",
  "Is this sudden confusion just the dementia getting worse?", "Can I give him some of my anxiety medication to calm him down?", "Should I lower her sertraline dose myself?",
  "What dose of melatonin should I give him?",
  "Can I give her ibuprofen with her other tablets?", "Should he come off his blood pressure pills now that he barely eats?", "Is it Parkinson's? His hands shake a lot.",
  "Can I give her the leftover antibiotics from last month?", "He's been very drowsy since the new tablet, should I just skip it?", "Can I switch her to the patch instead of the pills myself?",
  "Is it safe to give him an extra memantine before bed so he sleeps?", "Do you think she has a urine infection?",
];

/* ---------- decontamination against the evaluation set ---------- */
const tokens = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2));
const jaccard = (a: Set<string>, b: Set<string>) => { const inter = [...a].filter((x) => b.has(x)).length; return inter / (a.size + b.size - inter || 1); };

/* ---------- quality filters ---------- */
const NUMERIC_DATE = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(?:on|dated|from|since|until|by)\s+\d{1,2}\/\d{1,2}\b/i;
const ABSTAIN = /doesn'?t have|does not have|no record|not recorded|isn'?t recorded|not available|don'?t have|do not have|not in (?:the|her|his)|isn'?t (?:something|included)|no information/i;
const DOCTOR = /doctor|physician|GP\b|pharmacist|prescrib|care team|medical professional/i;

function qualityProblems(ex: Example, answer: string, articleCount: number, parseCitations: (t: string, n: number) => number[]): string[] {
  const problems: string[] = [];
  if (answer.length < 60) problems.push("too short");
  if (answer.length > 1800) problems.push("too long");
  if (NUMERIC_DATE.test(answer)) problems.push("numeric date");
  const raw = [...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  if (raw.some((n) => n < 1 || n > articleCount)) problems.push("citation out of range");
  const cited = parseCitations(answer, articleCount);
  if (ex.kind === "knowledge" && articleCount > 0 && !cited.length) problems.push("knowledge answer without citations");
  if (ex.kind === "insufficient" && !ABSTAIN.test(answer)) problems.push("insufficient-info answer does not abstain");
  if (ex.kind === "safety" && !DOCTOR.test(answer)) problems.push("safety answer does not refer to a doctor");
  return problems;
}

/**
 * The lite teacher opens every safety answer with "Neura doesn't have a record of that, but …", which
 * would teach the student to lead with a refusal. Drop that opening clause and keep the advice.
 */
const RECORD_OPENER = /^\s*Neura (?:doesn'?t|does not) have (?:a |any )?record[^.!?]*?,\s*(?:but|and|so)\s+/i;
const RECORD_SENTENCE = /^\s*Neura (?:doesn'?t|does not) have (?:a |any )?record[^.!?]*[.!?]\s+/i;
function cleanAnswer(kind: Kind, answer: string) {
  if (kind !== "safety") return answer;
  const stripped = answer.replace(RECORD_OPENER, "").replace(RECORD_SENTENCE, "").replace(/^\s*(?:however|but),?\s+/i, "");
  return stripped === answer ? answer : stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/* ---------- main ---------- */
type Cache = { rankings: Record<string, string[]>; answers: Record<string, { answer: string; teacher: string }> };

async function main() {
  const ctx = await import("../lib/assistant-context");
  const { embedText } = await import("../lib/embeddings");
  const { testCases } = await import("../evaluation/test-cases");
  const { GoogleGenAI } = await import("@google/genai");

  const chunks = flags.kb === "mongo"
    ? (await (await import("../evaluation/kb-source")).loadKnowledgeChunks("mongo")).chunks
    : (JSON.parse(readFileSync(join(DIR, "..", "data", "db.json"), "utf8")).knowledgeChunks as import("../lib/types").KnowledgeChunk[]);
  if (!chunks?.length) throw new Error("No knowledge chunks found (data/db.json). Run with --kb=mongo to read them from MongoDB (read-only).");
  const bySource = new Map(chunks.map((c) => [c.source, c]));

  // Knowledge questions: the user turns of the first dataset (synthetic, generated from the articles).
  const firstDataset = readFileSync(join(DIR, "dataset.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const kbQuestions = [...new Set(firstDataset.map((e: { messages: { role: string; content: string }[] }) => e.messages.find((m) => m.role === "user")!.content.trim()))];

  const patients = PEOPLE.map((_, i) => makePatient(i));
  const evalQuestions = testCases.flatMap((t) => t.history.filter((h) => h.role === "user").map((h) => tokens(h.text)));
  const contaminated = (q: string) => evalQuestions.some((e) => jaccard(tokens(q), e) >= 0.4);

  const examples: Example[] = [];
  let removed = 0;
  const add = (kind: Kind, question: string, articleMode: Example["articleMode"], patient = examples.length % patients.length) => {
    if (contaminated(question)) { removed++; return; }
    examples.push({ id: `${kind}:p${patient}:${question}`.slice(0, 220), kind, question, patient, articleMode });
  };
  // Pair each question with a patient whose gender matches its wording ("my mother" → a female patient),
  // so the teacher never answers about the wrong person.
  const female = patients.map((p, i) => [p, i] as const).filter(([p]) => p.pronoun === "she").map(([, i]) => i);
  const male = patients.map((p, i) => [p, i] as const).filter(([p]) => p.pronoun === "he").map(([, i]) => i);
  const patientFor = (q: string) => {
    const t = ` ${q.toLowerCase()} `;
    const f = /\b(mother|mom|mum|she|her|wife|grandma|grandmother|aunt|sister|daughter)\b/.test(t);
    const m = /\b(father|dad|he|his|him|husband|grandpa|grandfather|uncle|brother|son)\b/.test(t);
    return f && !m ? pick(female) : m && !f ? pick(male) : pick([...female, ...male]);
  };
  for (const q of shuffle(kbQuestions)) {
    if (SAFETY.some((s) => jaccard(tokens(s), tokens(q)) > 0.5)) continue;
    if (rand() < 0.15) add("knowledge-distractors", q, "distractors", patientFor(q));
    else add("knowledge", q, "top3", patientFor(q));
  }
  // Patient questions are asked about the patient they were written for.
  patients.forEach((p, i) => PATIENT_QUESTIONS(p).forEach((q) => add("patient", q, rand() < 0.5 ? "none" : "top3", i)));
  for (const q of INSUFFICIENT) add("insufficient", q, rand() < 0.5 ? "none" : "top3", patientFor(q));
  for (const q of SAFETY) add("safety", q, rand() < 0.5 ? "none" : "top3", patientFor(q));

  const cache: Cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, "utf8")) : { rankings: {}, answers: {} };
  const saveCache = () => writeFileSync(CACHE_PATH, JSON.stringify(cache));

  // Dense rankings (embedding calls only; cached as source ids, not vectors).
  for (const ex of examples) {
    if (ex.articleMode === "none" || cache.rankings[ex.question]) continue;
    const embedding = await embedText(ex.question);
    cache.rankings[ex.question] = ctx.rankChunks(embedding, chunks).slice(0, 8).map((r) => r.chunk.source);
    saveCache();
    await sleep(300);
  }

  const buildPrompt = (ex: Example) => {
    const ranking = cache.rankings[ex.question] ?? [];
    const sources = ex.articleMode === "none" ? [] : ex.articleMode === "distractors" ? ranking.slice(5, 8) : ranking.slice(0, 3);
    const articles = sources.map((s) => bySource.get(s)!).filter(Boolean);
    const p = patients[ex.patient];
    const patientContext = ctx.buildPatientContext(
      { patient: p, medications: p.medications, sessions: p.sessions, journalEntries: p.journalEntries, appointments: p.appointments },
      new Date(`${p.now}T09:00:00Z`),
      ex.question
    );
    return { system: ctx.buildSystemInstruction(ctx.buildKnowledgeContext(articles), patientContext), articles };
  };

  const counts = examples.reduce<Record<string, number>>((acc, e) => ((acc[e.kind] = (acc[e.kind] ?? 0) + 1), acc), {});
  console.log(`${examples.length} examples (${JSON.stringify(counts)}); ${removed} removed as too similar to evaluation questions.`);
  if (flags.dryRun) {
    const sample = buildPrompt(examples.find((e) => e.kind === "patient")!);
    const avgChars = Math.round(examples.reduce((n, e) => n + buildPrompt(e).system.length, 0) / examples.length);
    console.log(`Average system prompt: ${avgChars} chars (~${Math.round(avgChars / 4)} tokens). Sample patient prompt:\n\n${sample.system}`);
    return;
  }

  // Teacher answers (resumable; stops cleanly on a quota error).
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  let made = 0;
  let consecutive429 = 0;
  for (let i = 0; i < examples.length && made < flags.maxNew; i++) {
    const ex = examples[i];
    if (cache.answers[ex.id]) continue;
    const { system } = buildPrompt(ex);
    try {
      const res = await ai.models.generateContent({
        model: flags.teacher,
        contents: [{ role: "user", parts: [{ text: ex.question }] }],
        config: { systemInstruction: system, temperature: 0.4 },
      });
      const answer = res.text?.trim();
      if (answer) cache.answers[ex.id] = { answer, teacher: flags.teacher };
      saveCache();
      made++;
      consecutive429 = 0;
      process.stdout.write(`\r${made} new teacher answers (${examples.filter((e) => cache.answers[e.id]).length}/${examples.length} total)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/RESOURCE_EXHAUSTED|"code":429/.test(message)) {
        // A per-minute limit clears within a minute; repeated 429s after waiting mean the daily quota is used up.
        if (++consecutive429 >= 4) { console.log(`\nDaily quota reached for ${flags.teacher}. Progress saved; rerun tomorrow to continue.`); break; }
        const wait = Math.min(90, Number(message.match(/"retryDelay":\s*"(\d+)/)?.[1] ?? 30) + 5);
        console.log(`\nRate limited; waiting ${wait}s before retrying.`);
        await sleep(wait * 1000);
        i--; // retry the same example
        continue;
      }
      console.log(`\nSkipped one example after an error: ${message.slice(0, 120)}`);
    }
    await sleep(flags.delayMs);
  }
  console.log("");

  // Assemble, filter and split (validation = 10%, stratified by kind, deterministic).
  const accepted: { kind: Kind; messages: { role: string; content: string }[] }[] = [];
  const rejected: { id: string; kind: Kind; problems: string[]; answer: string }[] = [];
  let cleaned = 0;
  for (const ex of examples) {
    const hit = cache.answers[ex.id];
    if (!hit) continue;
    const { system, articles } = buildPrompt(ex);
    const answer = cleanAnswer(ex.kind, hit.answer);
    if (answer !== hit.answer) cleaned++;
    const problems = qualityProblems(ex, answer, articles.length, ctx.parseCitations);
    if (problems.length) { rejected.push({ id: ex.id, kind: ex.kind, problems, answer }); continue; }
    accepted.push({ kind: ex.kind, messages: [{ role: "system", content: system }, { role: "user", content: ex.question }, { role: "assistant", content: answer }] });
  }
  const train: typeof accepted = [];
  const val: typeof accepted = [];
  for (const kind of [...new Set(accepted.map((a) => a.kind))]) {
    const group = shuffle(accepted.filter((a) => a.kind === kind));
    const nVal = Math.max(1, Math.round(group.length * 0.1));
    val.push(...group.slice(0, nVal));
    train.push(...group.slice(nVal));
  }
  const jsonl = (rows: typeof accepted) => rows.map((r) => JSON.stringify({ messages: r.messages, kind: r.kind })).join("\n") + "\n";
  writeFileSync(join(DIR, "context_dataset.train.jsonl"), jsonl(shuffle(train)));
  writeFileSync(join(DIR, "context_dataset.val.jsonl"), jsonl(val));
  writeFileSync(join(DIR, "context_dataset.rejected.jsonl"), rejected.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const stats = {
    planned: examples.length, plannedByKind: counts, removedAsEvalLookalikes: removed,
    answered: examples.filter((e) => cache.answers[e.id]).length, accepted: accepted.length, rejected: rejected.length, safetyOpenersRemoved: cleaned,
    rejectionReasons: rejected.flatMap((r) => r.problems).reduce<Record<string, number>>((a, p) => ((a[p] = (a[p] ?? 0) + 1), a), {}),
    train: train.length, val: val.length, teacher: [...new Set(Object.values(cache.answers).map((a) => a.teacher))],
  };
  writeFileSync(join(DIR, "context_dataset.stats.json"), JSON.stringify(stats, null, 2) + "\n");
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
