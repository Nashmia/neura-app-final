import "server-only";
import { MongoClient, type Db } from "mongodb";

/**
 * MongoDB connection helper (serverless-safe).
 *
 * On Vercel, each API route runs as a serverless function that may be invoked
 * many times. If we opened a brand-new connection every time, we'd quickly
 * exhaust MongoDB Atlas's connection limit. To avoid that, we cache a single
 * MongoClient on the Node.js `global` object and reuse it across invocations
 * (and across hot-reloads in local development).
 *
 * The connection is created lazily (only when a route actually needs the DB),
 * so `next build` can compile the app without a live database configured.
 */

const globalWithMongo = global as typeof globalThis & {
  _neuraMongoClientPromise?: Promise<MongoClient>;
};

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local (local) and to your Vercel project's Environment Variables (production)."
    );
  }
  if (!globalWithMongo._neuraMongoClientPromise) {
    const client = new MongoClient(uri);
    globalWithMongo._neuraMongoClientPromise = client.connect();
  }
  return globalWithMongo._neuraMongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB || "neura");
}
