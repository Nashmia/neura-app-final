import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Points lib/db.ts at a throwaway JSON file (never data/db.json, never MongoDB). Call before using getCollections(). */
export function useTempJsonDb() {
  delete process.env.MONGODB_URI;
  const dir = mkdtempSync(join(tmpdir(), "neura-test-"));
  process.env.NEURA_JSON_DB_PATH = join(dir, "db.json");
  return () => rmSync(dir, { recursive: true, force: true });
}
