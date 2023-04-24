import { CozoDb } from "cozo-node";
import crypto from "crypto";
import { readdir } from "fs/promises";

// const db = new CozoDb("sqlite", "./data/data.sqlite");
const db = new CozoDb();

const dataDir = "claims-ux-domain-concepts-2023-04-24";

function printQuery(query: string, params?: {}) {
  return db
    .run(query.trim(), params)
    .then((data) => console.log("OK\n", data))
    .catch((err) => console.error(err.display || err.message));
}

function quietQuery(query: string, params?: {}) {
  return db.run(query.trim(), params).catch((err) => console.error("!", err.display || err.message));
}

async function main() {
  let rebuild = 0;
  if (rebuild) {
    await initDb();
    await loadClaimsFromDisk();
  } else {
    await db.restore("./data/backup-v01.db");
  }

  await printQuery(`::relations`);

  // await printQuery(`
  // ?[id, text] := *concept {id, text}
  // `);

  await printQuery(`
  
  ?[fr_text,to_text, source_claim_id, target_claim_id, source_claim_title, target_claim_title, dist] := *concept:semantic {layer: 0, fr_id, to_id, dist},
    *concept {id: fr_id, text: fr_text},
    *concept {id: to_id, text: to_text},
    fr_id != to_id,
    fr_text != to_text,
    *claim_concept {conceptId: fr_id, claimId: source_claim_id},
    *claim_concept {conceptId: to_id, claimId: target_claim_id},
    *claim {id: source_claim_id, title: source_claim_title, rootTitle: source_claim_root_title},
    *claim {id: target_claim_id, title: target_claim_title, rootTitle: target_claim_root_title},
    source_claim_id != target_claim_id,
    source_claim_root_title != target_claim_root_title

  :order dist
  :limit 40
    `);

  if (rebuild) {
    await db.backup("./data/backup-v01.db");
  }
}

main();

async function initDb() {
  await printQuery(`
  :create claim {
    id: String, 
    => 
    title: String, 
    content: String, 
    rootTitle: String, 
    rootContent: String,
  }
  `);

  await printQuery(`
  :create claim_concept {
    claimId,
    conceptId,
  }`);

  await printQuery(`

  :create concept {
    id
    =>
    text,
    textVec: <F32; 1536>,
  }
  `);

  await printQuery(`
::hnsw create concept:semantic{
  fields: [textVec],
  dim: 1536,
  ef: 16,
  m: 32,
}`);
}

async function loadClaimsFromDisk() {
  let claimCount = 0;

  await readdir(`./data/${dataDir}`).then(async (files) => {
    // return;
    for (let file of files) {
      const claimChunk = (await import(`../data/${dataDir}/` + file)).default;

      for (let claim of claimChunk) {
        claimCount++;

        await Promise.all([
          addClaim({
            id: claim.claimId,
            title: claim.claimTitle,
            content: claim.claimContent,
            rootTitle: claim.rootDocumentTitle,
            rootContent: claim.rootDocumentContext,
          }),
          ...claim.concepts.map(async (concept: any) => {
            const conceptId = crypto.randomUUID();
            return Promise.all([
              addConcept({ id: conceptId, text: concept.concept, textVec: concept.embedding }),
              addClaimConcept({ claimId: claim.claimId, conceptId }),
            ]);
          }),
        ]);

        if (claimCount % 100 === 0) {
          console.log(claimCount);
        }
      }
    }
  });
}

async function addClaim(claim: { id: string; title: string; content: string; rootTitle: string; rootContent: string }) {
  await quietQuery(
    `
?[id, title, content, rootTitle, rootContent] <- [[
  $id,
  $title,
  $content,
  $rootTitle,
  $rootContent,
]]

:put claim {
  id 
  => 
  title, 
  content, 
  rootTitle, 
  rootContent,
}

  `,
    claim
  );
}

async function addClaimConcept(claimConcept: { claimId: string; conceptId: string }) {
  await quietQuery(
    `
  ?[claimId, conceptId] <- [[
    $claimId,
    $conceptId,
  ]]

  :put claim_concept {
    claimId,
    conceptId,
  }
  `,
    claimConcept
  );
}

async function addConcept(claim: { id: string; textVec: number[]; text: string }) {
  await quietQuery(
    `
?[id, text, textVec] <- [[
  $id,
  $text,
  $textVec,
]]

:put concept {
  id 
  => 
  text,
  textVec,
}

  `,
    claim
  );
}
