import assert from "assert";
import { createHash } from "crypto";
import { appendFile, readdir } from "fs/promises";
import path from "path";
import { AsyncDatabase } from "promised-sqlite3";
import { getEmbeddingProxy } from "../azure/embedding";
import { DELETE_EMBEDDING, GET_EMBEDDING, HAS_EMBEDDING, SCHEMA, UPSERT_EMBEDDING } from "./sql/schema";

export interface WithEmbedding {
  triples: string[];
}

export async function embedClaims(db: AsyncDatabase, sourceDataDir: string, logPath: string) {
  const files = await readdir(sourceDataDir);

  for (let i = 0; i < files.length; i++) {
    let counter = 0;
    const filename = files[i];
    const text: WithEmbedding[] = await (await import(path.resolve(sourceDataDir, filename))).default;
    const atoms = text.flatMap((t) => t.triples.flatMap((triple) => triple.split(" -> ")));

    const uniqueAtoms = [...new Set(atoms)];
    const newAtoms = (await Promise.all(uniqueAtoms.map(async (uniqueAtom) => hasEmbedding(db, uniqueAtom).then((has) => (has ? null : uniqueAtom))))).filter(
      Boolean
    ) as string[];

    console.log(`file ${i + 1}/${files.length}: ${atoms.length} texts, ${uniqueAtoms.length} unique, ${newAtoms.length} new`);

    await bulkGetEmbeddings(
      newAtoms,
      async (text, embedding) => {
        await putEmbedding(db, text, embedding);
        console.log(`file ${i + 1}/${files.length}|atom ${++counter}/${newAtoms.length}|${text.slice(0, 60)}${text.length > 60 ? "..." : ""}|`);
      },
      (text, error) => {
        appendFile(logPath, `${text}\n`);
        console.log(`error embedding ${text}: ${error}`);
      }
    );
  }
}

export async function bulkGetEmbeddings(
  texts: string[],
  onSuccess?: (text: string, embedding: number[]) => any,
  onError?: (text: string, error: string) => any
) {
  const embeddingProxy = getEmbeddingProxy(process.env.OPENAI_API_KEY!);

  return await Promise.all(
    [...new Set(texts)].map((uniqueText) =>
      embeddingProxy({ input: uniqueText })
        .then((res) => {
          const embeddingArray = res.data[0].embedding;
          onSuccess?.(uniqueText, embeddingArray);
          assert(Array.isArray(embeddingArray), `embedding for ${uniqueText} is not an array`);

          return { text: uniqueText, vec: embeddingArray };
        })
        .catch((error) => {
          onError?.(uniqueText, `${error?.name}: ${error.message}`);
          throw error;
        })
    )
  );
}

export async function initializeEmbeddingsDb(dbPath: string) {
  const db = await AsyncDatabase.open(dbPath);
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

export async function hasEmbedding(db: AsyncDatabase, text: string): Promise<boolean> {
  const key = createHash("sha1").update(text).digest("hex");
  const row = await db.get<{ count: number }>(HAS_EMBEDDING, [key]);
  return !!row?.count;
}

export async function deleteEmbedding(db: AsyncDatabase, text: string): Promise<void> {
  const key = createHash("sha1").update(text).digest("hex");
  const row = await db.run(DELETE_EMBEDDING, [key]);
}

export function bulkEmbedLegacy(texts: string[]): Promise<number[][]> {
  const embeddingProxy = getEmbeddingProxy(process.env.OPENAI_API_KEY!);

  return Promise.all(texts.map((text) => embeddingProxy({ input: text }).then((res) => res.data[0].embedding)));
}
