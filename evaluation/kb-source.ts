/**
 * Loads the knowledge-base chunks for the evaluation.
 *
 * DATA SAFETY: this is the only database access in the evaluation. It opens its own MongoDB client and
 * can only reach the `knowledgeChunks` collection (readOnlyCollection throws for any other name), and
 * only ever calls find(). It never touches users, patients or any other collection, and never writes.
 *
 * `--kb=local` reads the same chunks from data/db.json instead (no network).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MongoClient, type Db } from "mongodb";
import type { Chunk } from "./replica";

const ALLOWED_COLLECTION = "knowledgeChunks";

function readOnlyCollection(db: Db, name: string) {
  if (name !== ALLOWED_COLLECTION) throw new Error(`Evaluation may only read "${ALLOWED_COLLECTION}", refused "${name}".`);
  return db.collection<Chunk>(name);
}

export async function loadKnowledgeChunks(mode: "mongo" | "local"): Promise<{ chunks: Chunk[]; source: string }> {
  if (mode === "local") {
    const data = JSON.parse(readFileSync(join(__dirname, "..", "data", "db.json"), "utf8"));
    return { chunks: data.knowledgeChunks as Chunk[], source: "data/db.json (local file)" };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (needed for --kb=mongo). Use --kb=local to read data/db.json instead.");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "neura");
    const chunks = await readOnlyCollection(db, ALLOWED_COLLECTION).find({}, { projection: { _id: 0 } }).toArray();
    return { chunks: chunks as Chunk[], source: `MongoDB collection "${ALLOWED_COLLECTION}" (read-only)` };
  } finally {
    await client.close();
  }
}
