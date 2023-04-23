import dotenv from "dotenv";

import { mkdir, rm } from "fs/promises";
import { exportClaimByType } from "./lib/hits/claim-export";
import { EntityType } from "./lib/hits/entity";

dotenv.config();

const params = process.argv.slice(2);
console.log("Data loader started with params", params);

async function main() {
  switch (true) {
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

async function exportClaims() {
  await rm("./data/claims", { recursive: true }).catch();
  await mkdir("./data/claims", { recursive: true });
  await exportClaimByType(EntityType.Insight, "./data/claims");
  await exportClaimByType(EntityType.Recommendation, "./data/claims");
}

main();
