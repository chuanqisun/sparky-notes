import type { CozoDb } from "cozo-node";
import { writeFile } from "fs/promises";

export async function exportGraph(db: CozoDb) {
  const links = await db
    .run(
      `
{
  edge[e1, e2, p] := *claimTriple[claimId1, e1, p, e2]
  ?[e1, e2, p] := edge[e1, e2, p]
}`
    )
    .then((res) => {
      return res.rows.map((row: string[]) => ({
        source: row[0],
        target: row[1],
        predicate: row[2],
      }));
    })
    .catch((e) => console.log(e?.display ?? e));

  const nodes = await db
    .run(
      `
{
  node[e] := *claimTriple[any, e, any2, any3] or *claimTriple[any, any2, e, any3] or *claimTriple[any, any2, any3, e]
  ?[e] := node[e]
}`
    )
    .then((res) => {
      return res.rows.map((row: any[]) => ({ id: row[0] }));
    })
    .catch((e) => console.log(e?.display ?? e));

  await writeFile(`./data/graph-viz-export.json`, JSON.stringify({ nodes, links }, null, 2));
}
