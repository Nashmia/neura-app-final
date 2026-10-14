import { config } from "dotenv";
config({ path: ".env.local" });

import { findPatientForUser, getCollections, withoutMongoId } from "../lib/db";

// Read-only: prints how many accounts exist and who they are. Never prints password hashes.
async function main() {
  const collections = await getCollections();
  const users = await collections.users.find({}, withoutMongoId).toArray();
  users.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  console.log(`Database: ${process.env.MONGODB_URI ? `MongoDB (${process.env.MONGODB_DB || "default db"})` : "local data/db.json"}`);
  console.log(`Accounts stored: ${users.length}\n`);

  const rows = [];
  for (const user of users) {
    const patient = await findPatientForUser(collections, user.id);
    rows.push({ name: user.name, email: user.email, phone: user.phone, created: user.createdAt?.slice(0, 10), patient: patient?.name ?? "—" });
  }
  if (rows.length) console.table(rows);
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to list users:", error);
  process.exit(1);
});
