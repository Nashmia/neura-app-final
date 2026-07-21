import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getMongoDb } from "@/lib/mongodb";
import type { User, Patient, Medication, QuizSession } from "@/lib/types";

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

const dbPath = path.join(process.cwd(), "data", "db.json");
type Row = Record<string, unknown>;
type FileShape = { users: Row[]; patients: Row[]; medications: Row[]; quizSessions: Row[] };

async function readFile(): Promise<FileShape> {
  try {
    return JSON.parse(await fs.readFile(dbPath, "utf8")) as FileShape;
  } catch {
    return { users: [], patients: [], medications: [], quizSessions: [] };
  }
}

async function writeFile(data: FileShape): Promise<void> {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf8");
}

/** Every key in the filter must match the document (equality only). */
function matches(doc: Row, filter: Record<string, unknown>): boolean {
  return Object.keys(filter).every((key) => doc[key] === filter[key]);
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
}> {
  if (!process.env.MONGODB_URI) {
    // Local development fallback — no database required.
    return {
      users: new JsonCollection<User>("users"),
      patients: new JsonCollection<Patient>("patients"),
      medications: new JsonCollection<Medication>("medications"),
      quizSessions: new JsonCollection<QuizSession>("quizSessions"),
    };
  }

  const db = await getMongoDb();
  return {
    users: db.collection("users") as unknown as DataCollection<User>,
    patients: db.collection("patients") as unknown as DataCollection<Patient>,
    medications: db.collection("medications") as unknown as DataCollection<Medication>,
    quizSessions: db.collection("quizSessions") as unknown as DataCollection<QuizSession>,
  };
}

/** Hide MongoDB's internal `_id` so responses match the plain JSON shape. */
export const withoutMongoId = { projection: { _id: 0 } } as const;

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}
