import { CozoDb } from "cozo-node";
import { readdir } from "fs/promises";
import type { AsyncDatabase } from "promised-sqlite3";
import { getEmbedding, initializeEmbeddingsDb } from "./bulk-embed";
import { CREATE_CLAIM_TRIPLE_SCHEMA, CREATE_ENTITY_SCHEMA, CREATE_HNSW_INDEX, GET_RELATIONS, PUT_CLAIM_TRIPLE, PUT_ENTITY } from "./cozo-scripts/cozo-scripts";
import type { ClaimWithTriples } from "./data";

export async function queryGraph(graphDbPath: string) {
  const db = await initGraphDb(graphDbPath);
  const result = await db.run(`
  ?[text] := *entity{text}
  :limit 10
    `);

  db.close();
  console.log(result);
}

export async function buildGraph(claimsDir: string, embeddingsDbPath: string, graphDbPath: string) {
  const embeddingsDb = await initializeEmbeddingsDb(embeddingsDbPath);
  const graph = await initGraphDb(graphDbPath);
  console.log(await graph.run("::relations"));

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
        await graph.run(PUT_CLAIM_TRIPLE, {
          claimId: claim.claimId,
          s: relation.s.text,
          o: relation.o.text,
          p: relation.p.text,
        });

        progress.tripleSuccess++;

        await graph.run(PUT_ENTITY, {
          text: relation.s.text,
          vec: relation.s.vec,
        });
        await graph.run(PUT_ENTITY, {
          text: relation.p.text,
          vec: relation.p.vec,
        });
        await graph.run(PUT_ENTITY, {
          text: relation.o.text,
          vec: relation.o.vec,
        });

        progress.tripleSuccess++;
      } catch (e: any) {
        progress.tripleError++;
        console.log(e.display ?? e.message ?? e);
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
  const db = new CozoDb("rocksdb", graphDbBackupPath);
  const relations = await db.run(GET_RELATIONS);
  const existingRelations = new Set<string>(relations.rows.map((row: any[]) => row[0]));
  if (!existingRelations.has("entity")) {
    console.log(`create entity schema`);
    await db.run(CREATE_ENTITY_SCHEMA);
  }
  if (!existingRelations.has("entity:semantic")) {
    console.log(`create NHSW index`);
    await db.run(CREATE_HNSW_INDEX);
  }
  if (!existingRelations.has("claimTriple")) {
    console.log(`create claim triple schema`);
    await db.run(CREATE_CLAIM_TRIPLE_SCHEMA);
  }

  console.log(`DB ready: ${graphDbBackupPath}`);
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
