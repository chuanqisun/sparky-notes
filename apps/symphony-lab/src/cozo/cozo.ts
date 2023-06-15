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
  private intializedDb: Promise<CozoDb>;

  constructor(schema: string) {
    this.intializedDb = dbAsync.then((db) => {
      db.run(schema, "", false);

      return db;
    });
  }

  public async query(cozoScript: string, params?: any) {
    return this.intializedDb.then((db) => {
      const result = db.run(cozoScript, params ? JSON.stringify(params) : "", true);
      return JSON.parse(result) as CozoResult;
    });
  }

  public async mutate(cozoScript: string, params?: any) {
    return this.intializedDb.then((db) => {
      const result = db.run(cozoScript, params ? JSON.stringify(params) : "", false);
      return JSON.parse(result) as CozoResult;
    });
  }

  public async listRelations(): Promise<RelationSchema[]> {
    const res = await this.query("::relations");
    const names = res.rows.map((row) => row[0]);
    const relations = await Promise.all(
      names.map(async (name) => ({
        name: name as string,
        cols: (await this.query(`::columns ${name}`).then((res) => res.rows.map((row) => row[0]))) as string[],
      }))
    );
    return relations;
  }
}
