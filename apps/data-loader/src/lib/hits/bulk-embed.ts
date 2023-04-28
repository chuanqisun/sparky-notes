import { createHash } from "crypto";
import { AsyncDatabase } from "promised-sqlite3";
import { getEmbeddingProxy } from "../azure/embedding";
import { GET_EMBEDDING, SCHEMA, UPSERT_EMBEDDING } from "./sql/schema";

export function bulkEmbed(texts: string[]): Promise<number[][]> {
  const embeddingProxy = getEmbeddingProxy(process.env.OPENAI_API_KEY!);

  return Promise.all(texts.map((text) => embeddingProxy({ input: text }).then((res) => res.data[0].embedding)));
}

export async function ensureDb() {
  const db = await AsyncDatabase.open("./data/embeddings.db");
  await db.run(SCHEMA);
  return db;
}

export async function putEmbedding(db: AsyncDatabase, text: string, embedding: number[]) {
  const key = createHash("sha1").update(text).digest("hex");
  await db.run(UPSERT_EMBEDDING, [key, `[${embedding.join(",")}]`]);
}

export async function getEmbedding(db: AsyncDatabase, text: string): Promise<number[] | null> {
  const key = createHash("sha1").update(text).digest("hex");
  const row = await db.get<{ vec: string }>(GET_EMBEDDING, [key]);
  return row ? JSON.parse(row.vec) : null;
}
