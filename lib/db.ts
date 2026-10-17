import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getMongoDb } from "@/lib/mongodb";
import type { User, Patient, Medication, QuizSession, QuizTranscript, Appointment, JournalEntry, KnowledgeChunk } from "@/lib/types";

/**
 * Data access layer (dual-mode).
 *
 * The API routes talk to "collections" through a small interface (DataCollection).
 * There are two implementations behind it:
 *
 *   1. MongoDB  — used when MONGODB_URI is set (production / Vercel). Each entity
 *      lives in its own collection: users, patients, medications, quizSessions.
 *
 *   2. Local JSON file — used when MONGODB_URI is NOT set. Reads/writes
 *      data/db.json so you can sign up, log in, and view the dashboard locally
 *      without setting up a database. (This file store cannot work on Vercel,
 *      whose filesystem is read-only — that's what MongoDB is for.)
 *
 * Because both implementations satisfy the same interface, none of the API
 * routes need to know or care which backend is active.
 */

/** The subset of the MongoDB collection API our routes actually use. */
export interface DataCollection<T> {
  findOne(filter: Record<string, unknown>, options?: unknown): Promise<T | null>;
  find(filter: Record<string, unknown>, options?: unknown): { toArray(): Promise<T[]> };
  insertOne(doc: T): Promise<unknown>;
  insertMany(docs: T[]): Promise<unknown>;
  updateOne(filter: Record<string, unknown>, update: { $set: Partial<T> }): Promise<unknown>;
  findOneAndUpdate(filter: Record<string, unknown>, update: { $set: Partial<T> }, options?: unknown): Promise<T | null>;
}

/* ------------------------------------------------------------------ */
/* Local JSON-file implementation                                     */
/* ------------------------------------------------------------------ */

// NEURA_JSON_DB_PATH lets tests point the fallback store at a temporary file instead of data/db.json.
const dbPath = () => process.env.NEURA_JSON_DB_PATH || path.join(process.cwd(), "data", "db.json");
type Row = Record<string, unknown>;
type FileShape = {
  users: Row[];
  patients: Row[];
  medications: Row[];
  quizSessions: Row[];
  quizTranscripts: Row[];
  appointments: Row[];
  journalEntries: Row[];
  knowledgeChunks: Row[];
  rateLimits: Row[];
};

const emptyFileShape: FileShape = {
  users: [],
  patients: [],
  medications: [],
  quizSessions: [],
  quizTranscripts: [],
  appointments: [],
  journalEntries: [],
  knowledgeChunks: [],
  rateLimits: [],
};

async function readFile(): Promise<FileShape> {
  try {
    const data = JSON.parse(await fs.readFile(dbPath(), "utf8")) as Partial<FileShape>;
    return { ...emptyFileShape, ...data };
  } catch {
    return { ...emptyFileShape };
  }
}

async function writeFile(data: FileShape): Promise<void> {
  await fs.mkdir(path.dirname(dbPath()), { recursive: true });
  await fs.writeFile(dbPath(), JSON.stringify(data, null, 2), "utf8");
}

/** Every key in the filter must match the document (equality, or array-contains when the field is an array). */
function matches(doc: Row, filter: Record<string, unknown>): boolean {
  return Object.keys(filter).every((key) => {
    const value = doc[key];
    return Array.isArray(value) ? value.includes(filter[key]) : value === filter[key];
  });
}

class JsonCollection<T> implements DataCollection<T> {
  constructor(private key: keyof FileShape) {}

  async findOne(filter: Record<string, unknown>): Promise<T | null> {
    const data = await readFile();
    return (data[this.key].find((doc) => matches(doc, filter)) as T) ?? null;
  }

  find(filter: Record<string, unknown>) {
    const key = this.key;
    return {
      async toArray(): Promise<T[]> {
        const data = await readFile();
        return data[key].filter((doc) => matches(doc, filter)) as T[];
      },
    };
  }

  async insertOne(doc: T): Promise<unknown> {
    const data = await readFile();
    data[this.key].push(doc as Row);
    await writeFile(data);
    return { acknowledged: true };
  }

  async insertMany(docs: T[]): Promise<unknown> {
    const data = await readFile();
    data[this.key].push(...(docs as Row[]));
    await writeFile(data);
    return { acknowledged: true };
  }

  async updateOne(filter: Record<string, unknown>, update: { $set: Partial<T> }): Promise<unknown> {
    const data = await readFile();
    const doc = data[this.key].find((item) => matches(item, filter));
    if (doc) Object.assign(doc, update.$set);
    await writeFile(data);
    return { acknowledged: true };
  }

  async findOneAndUpdate(filter: Record<string, unknown>, update: { $set: Partial<T> }): Promise<T | null> {
    const data = await readFile();
    const doc = data[this.key].find((item) => matches(item, filter));
    if (!doc) return null;
    Object.assign(doc, update.$set);
    await writeFile(data);
    return doc as T;
  }
}

/* ------------------------------------------------------------------ */
/* Collection factory                                                 */
/* ------------------------------------------------------------------ */

export async function getCollections(): Promise<{
  users: DataCollection<User>;
  patients: DataCollection<Patient>;
  medications: DataCollection<Medication>;
  quizSessions: DataCollection<QuizSession>;
  quizTranscripts: DataCollection<QuizTranscript>;
  appointments: DataCollection<Appointment>;
  journalEntries: DataCollection<JournalEntry>;
  knowledgeChunks: DataCollection<KnowledgeChunk>;
}> {
  if (!process.env.MONGODB_URI) {
    // Local development fallback — no database required.
    return {
      users: new JsonCollection<User>("users"),
      patients: new JsonCollection<Patient>("patients"),
      medications: new JsonCollection<Medication>("medications"),
      quizSessions: new JsonCollection<QuizSession>("quizSessions"),
      quizTranscripts: new JsonCollection<QuizTranscript>("quizTranscripts"),
      appointments: new JsonCollection<Appointment>("appointments"),
      journalEntries: new JsonCollection<JournalEntry>("journalEntries"),
      knowledgeChunks: new JsonCollection<KnowledgeChunk>("knowledgeChunks"),
    };
  }

  const db = await getMongoDb();
  return {
    users: db.collection("users") as unknown as DataCollection<User>,
    patients: db.collection("patients") as unknown as DataCollection<Patient>,
    medications: db.collection("medications") as unknown as DataCollection<Medication>,
    quizSessions: db.collection("quizSessions") as unknown as DataCollection<QuizSession>,
    quizTranscripts: db.collection("quizTranscripts") as unknown as DataCollection<QuizTranscript>,
    appointments: db.collection("appointments") as unknown as DataCollection<Appointment>,
    journalEntries: db.collection("journalEntries") as unknown as DataCollection<JournalEntry>,
    knowledgeChunks: db.collection("knowledgeChunks") as unknown as DataCollection<KnowledgeChunk>,
  };
}

/** Hide MongoDB's internal `_id` so responses match the plain JSON shape. */
export const withoutMongoId = { projection: { _id: 0 } } as const;

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

/**
 * Look up the patient the given user is a caregiver for (as creator or as an
 * invited co-caregiver). A patient can have multiple caregiverIds, so this
 * goes through the array-contains matching in `matches()`/Mongo instead of
 * the old `{ userId }` equality lookup, which only ever matched the creator.
 */
export async function findPatientForUser(
  collections: { patients: DataCollection<Patient> },
  userId: string
): Promise<Patient | null> {
  return collections.patients.findOne({ caregiverIds: userId }, withoutMongoId);
}

/* ------------------------------------------------------------------ */
/* Rate-limit counters                                                */
/* ------------------------------------------------------------------ */

let rateLimitIndexReady: Promise<unknown> | null = null;

/**
 * Atomically adds 1 to the counter `key` and returns the new count. The counter disappears after
 * `expiresAt`. Stored in the database (not in memory) so limits hold across serverless instances:
 * MongoDB uses a single upserting $inc plus a TTL index; the local JSON store does the same in-file.
 */
export async function incrementCounter(key: string, expiresAt: Date): Promise<number> {
  if (!process.env.MONGODB_URI) {
    const data = await readFile();
    const now = Date.now();
    data.rateLimits = data.rateLimits.filter((row) => Date.parse(String(row.expiresAt)) > now);
    let row = data.rateLimits.find((r) => r.key === key);
    if (!row) {
      row = { key, count: 0, expiresAt: expiresAt.toISOString() };
      data.rateLimits.push(row);
    }
    row.count = Number(row.count) + 1;
    await writeFile(data);
    return row.count as number;
  }

  const db = await getMongoDb();
  const collection = db.collection<{ _id: string; count: number; expiresAt: Date }>("rateLimits");
  rateLimitIndexReady ??= collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((error) => {
    rateLimitIndexReady = null; // counters still work without the index; retry creating it next time
    console.error("Could not create the rateLimits TTL index:", error);
  });
  const doc = await collection.findOneAndUpdate(
    { _id: key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, returnDocument: "after" }
  );
  return doc?.count ?? 1;
}
