import dotenv from "dotenv";

import { mkdir, readdir, rm } from "fs/promises";
import { exportClaimByType, type ExportedClaim } from "./lib/hits/claim-export";
import { EntityType } from "./lib/hits/entity";

dotenv.config();

const params = process.argv.slice(2);
console.log("Data loader started with params", params);

async function main() {
  switch (true) {
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

async function embedClaims() {
  const claimChunkFiles = await readdir("./data/claims");
  console.log(`Will embed ${claimChunkFiles.length} files`);

  for (let filename of claimChunkFiles) {
    const claims: ExportedClaim[] = (await import("../data/claims/" + filename, { assert: { type: "json" } })).default;
    console.log(claims[0].claimTitle);
    break;
  }
}

async function exportClaims() {
  await rm("./data/claims", { recursive: true }).catch();
  await mkdir("./data/claims", { recursive: true });
  await exportClaimByType(EntityType.Insight, "./data/claims");
  await exportClaimByType(EntityType.Recommendation, "./data/claims");
}

main();
