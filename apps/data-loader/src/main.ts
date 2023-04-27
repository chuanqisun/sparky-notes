import dotenv from "dotenv";

import { CozoDb } from "cozo-node";
import path from "path";
import { clearClaims } from "./lib/hits/clear-claims";
import { exportClaims } from "./lib/hits/export-claims";
import { semantcQueryHandler } from "./lib/hits/interactive-claim-query";
import { parseClaims } from "./lib/hits/parse-claims";
import { startRepl } from "./lib/repl/start";

dotenv.config();

const params = process.argv.slice(2);
const CLAIMS_DIR = path.resolve("./data/claims");

console.log("Data loader started with params", params);

async function main() {
  switch (true) {
    case params.includes("clear-claims"): {
      clearClaims(path.resolve(CLAIMS_DIR));
      break;
    }
    case params.includes("parse-claims"): {
      parseClaims(path.resolve(CLAIMS_DIR), "ux-domain-concepts");
      break;
    }
    case params.includes("parse-claims-v2"): {
      parseClaims(path.resolve(CLAIMS_DIR), "ux-domain-concepts");
      break;
    }

    case params.includes("export-claims"): {
      exportClaims(path.resolve(CLAIMS_DIR));
      break;
    }
    case params.includes("repl"): {
      const db = new CozoDb();
      console.log("✅ HNSW Database online");
      await db.restore("./data/backup-20240424v1.db");

      console.log("✅ Vector space alignment: UX Domain Concepts");
      console.log("✅ Human interace ready");

      startRepl([semantcQueryHandler.bind(null, db)]);

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
