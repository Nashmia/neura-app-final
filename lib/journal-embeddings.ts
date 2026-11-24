import "server-only";
import type { DataCollection } from "@/lib/db";
import { embedText } from "@/lib/embeddings";
import type { JournalEmbedding, JournalEntry } from "@/lib/types";

/** Notes shorter than this are mood taps or fragments: not worth embedding. */
export const MIN_EMBED_WORDS = 3;
const EMBED_TIMEOUT_MS = 6000;

export const embeddable = (entry: Pick<JournalEntry, "text">) => entry.text.trim().split(/\s+/).length >= MIN_EMBED_WORDS;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Embedding timed out.")), ms))]);
}

export async function embedEntry(journalEmbeddings: DataCollection<JournalEmbedding>, entry: JournalEntry): Promise<number[] | null> {
  if (!embeddable(entry)) return null;
  try {
    const embedding = await withTimeout(embedText(entry.text), EMBED_TIMEOUT_MS);
    await journalEmbeddings.insertOne({ entryId: entry.id, patientId: entry.patientId, embedding, createdAt: new Date().toISOString() });
    return embedding;
  } catch (error) {
    console.warn("Journal embedding failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Embeddings for the patient's notes, embedding up to `backfill` notes that don't have one yet
 * (notes written before this feature, or whose embedding failed at save time).
 */
export async function notesWithEmbeddings(
  collections: { journalEntries: DataCollection<JournalEntry>; journalEmbeddings: DataCollection<JournalEmbedding> },
  patientId: string,
  backfill = 15
): Promise<(JournalEntry & { embedding: number[] })[]> {
  const [entries, stored] = await Promise.all([
    collections.journalEntries.find({ patientId }, { projection: { _id: 0 } }).toArray(),
    collections.journalEmbeddings.find({ patientId }, { projection: { _id: 0 } }).toArray(),
  ]);
  const byEntry = new Map(stored.map((e) => [e.entryId, e.embedding]));
  const notes = entries.filter(embeddable).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const missing = notes.filter((n) => !byEntry.has(n.id)).slice(0, backfill);
  const filled = await Promise.all(missing.map((n) => embedEntry(collections.journalEmbeddings, n)));
  missing.forEach((n, i) => filled[i] && byEntry.set(n.id, filled[i]!));
  return notes.filter((n) => byEntry.has(n.id)).map((n) => ({ ...n, embedding: byEntry.get(n.id)! }));
}
