import init, { CozoDb } from "cozo-lib-wasm";
import wasmUrl from "cozo-lib-wasm/cozo_lib_wasm_bg.wasm?url";

export const dbAsync = init(wasmUrl).then(() => {
  const db = CozoDb.new();
  return db;
});

export interface CozoResult {
  headers: string[];
  ok: boolean;
  rows: CozoValue[][];
}

export type CozoValue = string | number | boolean | null;

export class Cozo {
  public async query(cozoScript: string, params?: any) {
    return dbAsync.then((db) => {
      const result = db.run(cozoScript, params ? JSON.stringify(params) : "", true);
      return JSON.parse(result) as CozoResult;
    });
  }

  public async mutate(cozoScript: string, params?: any) {
    return dbAsync.then((db) => {
      const result = db.run(cozoScript, params ? JSON.stringify(params) : "", false);
      return JSON.parse(result) as CozoResult;
    });
  }
}
