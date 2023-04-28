import { CozoDb } from "cozo-node";
import { existsSync } from "fs";
import { readdir } from "fs/promises";
import type { AsyncDatabase } from "promised-sqlite3";
import { getEmbedding, initializeEmbeddingsDb } from "./bulk-embed";
import { CREATE_GRAPH_SCHEMA } from "./cozo-scripts/cozo-scripts";
import type { ClaimWithTriples } from "./data";

export async function buildGraph(claimsDir: string, embeddingsDbPath: string, graphDbPath: string) {
  const embeddingsDb = await initializeEmbeddingsDb(embeddingsDbPath);
  const graphDb = initGraphDb(graphDbPath);

  const claimsIter = iterateClaims(claimsDir);
  for await (const claim of claimsIter) {
    const relations = await getRelations(embeddingsDb, claim);

    console.log(relations[0]);
  }
}

async function getRelations(embeddingsDb: AsyncDatabase, claim: ClaimWithTriples): Promise<EmbeddedRelation[]> {
  const rawRelations = await Promise.all(
    claim.triples.map(async (triple) => {
      const [s, p, o] = triple.split(" -> ");
      const [s_vec, p_vec, o_vec] = await Promise.all([getEmbedding(embeddingsDb, s), getEmbedding(embeddingsDb, p), getEmbedding(embeddingsDb, o)]);
      if (!s_vec || !p_vec || !o_vec) {
        console.log(`Missing embedding for ${s}, ${p}, ${o}`);
        return null;
      }

      return {
        subject: {
          text: s,
          vec: s_vec,
        },
        predicate: {
          text: p,
          vec: p_vec,
        },
        object: {
          text: o,
          vec: o_vec,
        },
      };
    })
  );

  return rawRelations.filter(Boolean) as EmbeddedRelation[];
}

export interface EmbeddedRelation {
  subject: EmbeddedTerm;
  predicate: EmbeddedTerm;
  object: EmbeddedTerm;
}

export interface EmbeddedTerm {
  text: string;
  vec: number[];
}

async function* iterateClaims(claimsDir: string, batchSize?: string): AsyncGenerator<ClaimWithTriples> {
  const claimChunkFiles = await readdir(claimsDir);
  for (const claimChunkFile of claimChunkFiles) {
    const claims = (await import(`${claimsDir}/${claimChunkFile}`)).default;
    for (const claim of claims) {
      yield claim;
    }
  }
}

async function initGraphDb(graphDbPath: string) {
  const db = new CozoDb();

  if (existsSync(graphDbPath)) {
    await db.restore(graphDbPath);
    console.log(`Restore graph: ${graphDbPath}`);
  } else {
    await db.run(CREATE_GRAPH_SCHEMA);
    console.log(`Create graph: ${graphDbPath}`);
  }

  return db;
}
