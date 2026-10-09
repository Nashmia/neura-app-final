import { config } from "dotenv";
config({ path: ".env.local" });

import { createId, getCollections, withoutMongoId } from "../lib/db";
import { embedText } from "../lib/embeddings";
import { knowledgeBase } from "./knowledge-base";

async function main() {
  const { knowledgeChunks } = await getCollections();

  for (const article of knowledgeBase) {
    const embedding = await embedText(`${article.title}\n\n${article.text}`);
    const existing = await knowledgeChunks.findOne({ source: article.source }, withoutMongoId);

    if (existing) {
      await knowledgeChunks.updateOne({ source: article.source }, { $set: { title: article.title, text: article.text, embedding } });
      console.log(`Updated: ${article.title}`);
    } else {
      await knowledgeChunks.insertOne({ id: createId("kb"), source: article.source, title: article.title, text: article.text, embedding });
      console.log(`Inserted: ${article.title}`);
    }
  }

  console.log(`\nDone. Seeded ${knowledgeBase.length} knowledge base articles.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to seed knowledge base:", error);
  process.exit(1);
});
