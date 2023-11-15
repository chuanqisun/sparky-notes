import { CozoDb } from "cozo-node";
import { existsSync } from "fs";
import { argv } from "process";

const [_, __, dbEngine, dbPath] = argv;

const isExisting = existsSync(dbPath);
const db = new CozoDb(dbEngine, dbPath);
console.log(`[worker] Started ${dbEngine} ${dbPath}`);

export interface DbWorkerRequest {
  _mid: number;

  run?: {
    query: string;
    params?: any;
  };

  ensureSchema?: string;

  close?: boolean;
}

process.on("message", async (req: DbWorkerRequest) => {
  const ok = respondSuccess.bind(null, req);
  const err = respondError.bind(null, req);

  if (req.ensureSchema) {
    if (!isExisting) {
      await db.run(req.ensureSchema).then(ok).catch(err);
    } else {
      ok();
    }
  }

  if (req.run) {
    await db.run(req.run.query, req.run.params).then(ok).catch(err);
  }

  if (req.close) {
    db.close();
    ok();
  }
});

process.on("exit", handleExit);
process.on("SIGINT", handleExit);

function respondSuccess(req: DbWorkerRequest, data?: any) {
  return process.send?.({ _mid: req._mid, data });
}
function respondError(req: DbWorkerRequest, error?: any) {
  return process.send?.({ _mid: req._mid, error: error ?? new Error("Unknown error") });
}

function handleExit() {
  db.close();
  process.exit();
}
