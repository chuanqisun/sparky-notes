import dotenv from "dotenv";

import path from "path";
import { embedClaims } from "./lib/hits/claim-embed";
import { exportClaims } from "./lib/hits/claim-export";
import { parseClaims } from "./lib/hits/claim-parse";

dotenv.config();

const params = process.argv.slice(2);
console.log("Data loader started with params", params);

async function main() {
  switch (true) {
    case params.includes("parse-claims"): {
      parseClaims(path.resolve("./data/claims"));
      break;
    }
    case params.includes("embed-claims"): {
      embedClaims();
      break;
    }
    case params.includes("export-claims"): {
      exportClaims(path.resolve("./data/claims"));
      break;
    }
    default: {
      console.log(`
Usage: npm start -- [program]

Programs:
  export-claims: export all HITS claims
  parse-claims: parse claim into ontology entities and relations
`);
    }
  }
}

main();
