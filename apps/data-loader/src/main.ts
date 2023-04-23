import dotenv from "dotenv";

import { mkdir, readdir, rm } from "fs/promises";
import { getEmbeddingProxy } from "./lib/azure/embedding";
import { exportClaimByType, type ExportedClaim } from "./lib/hits/claim-export";
import { EntityType } from "./lib/hits/entity";

dotenv.config();

const params = process.argv.slice(2);
console.log("Data loader started with params", params);

async function main() {
  switch (true) {
    case params.includes("parse-claims"): {
      parseClaims();
      break;
    }
    case params.includes("embed-claims"): {
      embedClaims();
      break;
    }
    case params.includes("export-claims"): {
      exportClaims();
      break;
    }
    default: {
      console.log(`
Usage: npm start -- [program]

Programs:
  export-claims: export all HITS claims
`);
    }
  }
}

main();

async function parseClaims() {
  const claimChunkFiles = await readdir("./data/claims");
  console.log(`Will parse ${claimChunkFiles.length} files`);

  const embeddingProxy = getEmbeddingProxy(process.env.OPENAI_API_KEY!, process.env.OPENAI_EMBEDDINGS_ENDPOINT!);

  let i = 0;
  for (let filename of claimChunkFiles) {
    const claims: ExportedClaim[] = (await import("../data/claims/" + filename, { assert: { type: "json" } })).default;
    const embedding = (await embeddingProxy({ input: claims[0].claimTitle })).data[0].embedding;
    console.log(new Date().toLocaleTimeString(), embedding.length);
    i++;
    if (i > 5) break;
  }
}

async function exportClaims() {
  await rm("./data/claims", { recursive: true }).catch();
  await mkdir("./data/claims", { recursive: true });
  await exportClaimByType(EntityType.Insight, "./data/claims");
  await exportClaimByType(EntityType.Recommendation, "./data/claims");
}

async function embedClaims() {
  const claimChunkFiles = await readdir("./data/claims");
  console.log(`Will embed ${claimChunkFiles.length} files`);

  const embeddingProxy = getEmbeddingProxy(process.env.OPENAI_API_KEY!, process.env.OPENAI_EMBEDDINGS_ENDPOINT!);

  let i = 0;
  for (let filename of claimChunkFiles) {
    const claims: ExportedClaim[] = (await import("../data/claims/" + filename, { assert: { type: "json" } })).default;
    const embedding = (await embeddingProxy({ input: claims[0].claimTitle })).data[0].embedding;
    console.log(new Date().toLocaleTimeString(), embedding.length);
    i++;
    if (i > 5) break;
  }
}
