import type { CozoDb } from "cozo-node";
import { writeFile } from "fs/promises";

export async function exportGraph(db: CozoDb) {
  const similarityEdges = await db
    .run(
      `
entitySimilarityEdge[from, to] := *entity:semantic{layer: 0, fr_text: from, to_text: to, dist}, dist < 0.05, from < to

?[from, to] := entitySimilarityEdge[from, to]
`
    )
    .then((res) => {
      return res.rows.map((row: string[]) => ({
        source: row[0],
        target: row[1],
        predicate: "_similar_",
      }));
    })
    .catch((e) => console.log(e?.display ?? e));

  const predicateEdges = await db
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
  node[e] := *claimTriple[any, e, any2, any3] or *claimTriple[any, any2, any3, e]
  ?[e] := node[e]
}`
    )
    .then((res) => {
      return res.rows.map((row: any[]) => ({ id: row[0] }));
    })
    .catch((e) => console.log(e?.display ?? e));

  await writeFile(`./data/graph-viz-export.json`, JSON.stringify({ nodes, predicateEdges, similarityEdges }, null, 2));
}
