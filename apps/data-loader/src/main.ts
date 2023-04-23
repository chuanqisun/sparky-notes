import dotenv from "dotenv";

import path from "path";
import { embedClaims } from "./lib/hits/embed-claims";
import { exportClaims } from "./lib/hits/export-claims";
import { parseClaims } from "./lib/hits/parse-claims";

dotenv.config();

const params = process.argv.slice(2);
const CLAIMS_DIR = path.resolve("./data/claims");

console.log("Data loader started with params", params);

async function main() {
  switch (true) {
    case params.includes("parse-claims"): {
      parseClaims(path.resolve(CLAIMS_DIR));
      break;
    }
    case params.includes("embed-claims"): {
      embedClaims();
      break;
    }
    case params.includes("export-claims"): {
      exportClaims(path.resolve(CLAIMS_DIR));
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
