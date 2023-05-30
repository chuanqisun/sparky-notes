import dotenv from "dotenv";

import { CozoDb } from "cozo-node";
import path from "path";
import { analyzeDocument } from "./lib/coherence/analyze-document";
import { parseCoherence } from "./lib/coherence/parse-coherence";
import { embedClaims, initializeEmbeddingsDb } from "./lib/hits/bulk-embed";
import { clearClaims } from "./lib/hits/clear-claims";
import { exportClaims, exportClaimsV2 } from "./lib/hits/export-claims";
import { exportGraph } from "./lib/hits/export-graph";
import { buildGraph, initGraphDb, queryGraph } from "./lib/hits/graph";
import { parseClaims } from "./lib/hits/parse-claims";
import { claimV2ToV3, fixClaimsV2, fixClaimsV2Db, fixClaimsV2Underscore, parseClaimsV2 } from "./lib/hits/parse-claims-v2";
import { parseClaimsV3 } from "./lib/hits/parse-claims-v3";
import { parseClaimsV4 } from "./lib/hits/parse-claims-v4";
import { entityQueryHandler } from "./lib/repl/handlers/entity-query";
import { semantcQueryHandler } from "./lib/repl/handlers/interactive-claim-query";
import { startRepl } from "./lib/repl/start";

dotenv.config();

// const timestamp = Date.now();
const timestamp = 1684367019212;
const params = process.argv.slice(2);
const CLAIMS_DIR = path.resolve(`./data/claims-${timestamp}`);
const COHERENCE_CONTROLS_DIR = path.resolve(`./data/coherence/Controls`);

console.log("Data loader started with params", params);

async function main() {
  switch (true) {
    case params.includes("analyze-document"): {
      analyzeDocument(path.resolve("./data/coherence/parsed"), path.resolve(`./data/coherence/analyzed-${Date.now()}`));
      break;
    }

    case params.includes("build-graph"): {
      const embeddingDbPath = path.resolve("./data/embeddings.db");
      const graphDbBackupPath = path.resolve("./data/graph-db");
      const claimsDir = path.resolve("./data/claims-ux-domain-ontology-1682697637390");
      buildGraph(claimsDir, embeddingDbPath, graphDbBackupPath);
      break;
    }

    case params.includes("clear-claims"): {
      clearClaims(path.resolve(CLAIMS_DIR));
      break;
    }

    case params.includes("export-graph"): {
      const cozoDb = await initGraphDb(path.resolve("./data/graph-db"));
      exportGraph(cozoDb);
      break;
    }

    case params.includes("embed-claims"): {
      const dbPath = "./data/embeddings.db";
      const logPath = "./data/embeddings.log";
      const db = await initializeEmbeddingsDb(dbPath);
      embedClaims(db, "./data/claims-ux-domain-ontology-1682697637390", logPath);
      break;
    }
    case params.includes("fix-claims-v2"): {
      fixClaimsV2(path.resolve(CLAIMS_DIR), `ux-domain-ontology`);
      break;
    }
    case params.includes("fix-claims-v2-underscore"): {
      fixClaimsV2Underscore(path.resolve(CLAIMS_DIR), `ux-domain-ontology`);
      break;
    }
    case params.includes("fix-claims-v2-db"): {
      fixClaimsV2Db("./data/embeddings.db", path.resolve(CLAIMS_DIR), `ux-domain-ontology`);
      break;
    }
    case params.includes("migrate-claims-v2"): {
      claimV2ToV3(path.resolve(CLAIMS_DIR), `ux-domain-ontology`);
      break;
    }
    case params.includes("parse-coherence"): {
      parseCoherence(path.resolve(COHERENCE_CONTROLS_DIR));
      break;
    }
    case params.includes("parse-claims"): {
      parseClaims(path.resolve(CLAIMS_DIR), `ux-domain-concepts`);
      break;
    }
    case params.includes("parse-claims-v2"): {
      parseClaimsV2(path.resolve(CLAIMS_DIR), `ux-domain-ontology`);
      break;
    }
    case params.includes("parse-claims-v3"): {
      parseClaimsV3(path.resolve(CLAIMS_DIR), `ux-domain-ontology`);
      break;
    }
    case params.includes("parse-claims-v4"): {
      parseClaimsV4(path.resolve(CLAIMS_DIR), `insight.json`);
      break;
    }
    case params.includes("query-graph"): {
      queryGraph(path.resolve("./data/graph-db"));
      break;
    }
    case params.includes("export-claims"): {
      exportClaims(path.resolve(CLAIMS_DIR));
      break;
    }
    case params.includes("export-claims-v2"): {
      exportClaimsV2(path.resolve(CLAIMS_DIR));
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
    case params.includes("explorer"): {
      const db = await initGraphDb(path.resolve("./data/graph-db"));
      console.log("✅ HNSW Database online");

      startRepl([entityQueryHandler.bind(null, db)]);

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
