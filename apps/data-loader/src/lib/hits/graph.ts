import { CozoDb } from "cozo-node";
import { existsSync } from "fs";
import { readdir } from "fs/promises";
import type { AsyncDatabase } from "promised-sqlite3";
import { getEmbedding, initializeEmbeddingsDb } from "./bulk-embed";
import { CREATE_GRAPH_SCHEMA, PUT_CLAIM_TRIPLE } from "./cozo-scripts/cozo-scripts";
import type { ClaimWithTriples } from "./data";

export async function buildGraph(claimsDir: string, embeddingsDbPath: string, graphDbPath: string) {
  const embeddingsDb = await initializeEmbeddingsDb(embeddingsDbPath);

  const mutableDb = {
    db: await initGraphDb(graphDbPath),
  };

  const claimsIter = iterateClaims(claimsDir);
  const progress = {
    tripleSuccess: 0,
    tripleError: 0,
    claimsIndex: 0,
  };

  for await (const claim of claimsIter) {
    const relations = await getRelations(embeddingsDb, claim);

    for (const relation of relations) {
      try {
        await mutableDb.db.run(PUT_CLAIM_TRIPLE, {
          id: claim.claimId,
          s: relation.s.text,
          p: relation.p.text,
          o: relation.o.text,
          sVec: relation.s.vec,
          pVec: relation.p.vec,
          oVec: relation.o.vec,
        });
        progress.tripleSuccess++;
      } catch (e: any) {
        progress.tripleError++;
        console.log(e.display ?? e.message);
      } finally {
        console.log(`Progress: ${JSON.stringify(progress)}`);
      }
    }

    progress.claimsIndex++;
  }
}

export interface EmbeddedRelation {
  s: EmbeddedTerm;
  p: EmbeddedTerm;
  o: EmbeddedTerm;
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

async function initGraphDb(graphDbBackupPath: string) {
  const db = new CozoDb();

  if (existsSync(graphDbBackupPath)) {
    await db.restore(graphDbBackupPath);
    console.log(`Restore graph: ${graphDbBackupPath}`);
  } else {
    await db.run(CREATE_GRAPH_SCHEMA);
    console.log(`Create graph: ${graphDbBackupPath}`);
  }
  return db;
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
        s: {
          text: s,
          vec: s_vec,
        },
        p: {
          text: p,
          vec: p_vec,
        },
        o: {
          text: o,
          vec: o_vec,
        },
      };
    })
  );

  return rawRelations.filter(Boolean) as EmbeddedRelation[];
}
