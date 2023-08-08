import init, { CozoDb } from "cozo-lib-wasm";
import wasmUrl from "cozo-lib-wasm/cozo_lib_wasm_bg.wasm?url";

export const dbAsync = init(wasmUrl).then(() => {
  const db = CozoDb.new();
  return db;
});

export async function createDb() {
  await init(wasmUrl);
  return CozoDb.new();
}

export interface CozoResult {
  headers: string[];
  ok: boolean;
  rows: any[][];
  display?: string; // error only
  message?: string; // error only
}

export interface RelationSchema {
  name: string;
  cols: string[];
}

export class Cozo {
  private initializedDb: CozoDb;

  constructor(db: CozoDb, schema?: string) {
    this.initializedDb = db;

    if (schema) {
      db.run(schema, "", false);
      console.log("graph initized to", this.listRelations());
    }
  }

  public query(cozoScript: string, params?: any) {
    const result = this.initializedDb.run(cozoScript, params ? JSON.stringify(params) : "", true);
    const parsedResult = JSON.parse(result) as CozoResult;
    if (!parsedResult.ok) {
      console.log(parsedResult.display ?? parsedResult.message);
      throw new Error(parsedResult.message ?? "Cozo DB query error");
    }

    return parsedResult;
  }

  public mutate(cozoScript: string, params?: any) {
    const result = this.initializedDb.run(cozoScript, params ? JSON.stringify(params) : "", false);
    const parsedResult = JSON.parse(result) as CozoResult;
    if (!parsedResult.ok) {
      console.log(parsedResult.display ?? parsedResult.message);
      throw new Error(parsedResult.message ?? "Cozo DB query error");
    }

    return parsedResult;
  }

  public listRelations(): RelationSchema[] {
    const res = this.query("::relations");
    const names = res.rows.map((row) => row[0]);
    const relations = names.map((name) => ({
      name,
      cols: this.query(`::columns ${name}`).rows.map((row) => row[0]),
    }));

    return relations;
  }
}
