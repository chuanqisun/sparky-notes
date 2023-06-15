import init, { CozoDb } from "cozo-lib-wasm";
import wasmUrl from "cozo-lib-wasm/cozo_lib_wasm_bg.wasm?url";

export const dbAsync = init(wasmUrl).then(() => {
  const db = CozoDb.new();
  return db;
});

export interface CozoResult {
  headers: string[];
  ok: boolean;
  rows: any[][];
}

export interface RelationSchema {
  name: string;
  cols: string[];
}

export class Cozo {
  private initializedDb: CozoDb;

  constructor(db: CozoDb, schema: string) {
    db.run(schema, "", false);
    this.initializedDb = db;
    console.log("graph initized to", this.listRelations());
  }

  public query(cozoScript: string, params?: any) {
    const result = this.initializedDb.run(cozoScript, params ? JSON.stringify(params) : "", true);
    return JSON.parse(result) as CozoResult;
  }

  public mutate(cozoScript: string, params?: any) {
    const result = this.initializedDb.run(cozoScript, params ? JSON.stringify(params) : "", false);
    return JSON.parse(result) as CozoResult;
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
