import type { CozoDb } from "cozo-node";
import { writeFile } from "fs/promises";

export async function exportGraph(db: CozoDb) {
  performance.mark("start");
  const claimToClaimEdge = await db
    .run(
      `
shareTriple[claimId1, claimId2, predicate] := *claimTriple[claimId1, s, p, o], *claimTriple[claimId2, s, p, o], claimId1 < claimId2, predicate = 's,p,o'
shareSubjectPredicate[claimId1, claimId2, predicate] := not shareTriple[claimId1, claimId2, x], *claimTriple[claimId1, s, p, o1], *claimTriple[claimId2, s, p, o2], claimId1 < claimId2, predicate = 's,p'
sharePredicateObject[claimId1, claimId2, predicate] := not shareTriple[claimId1, claimId2, x], *claimTriple[claimId1, s1, p, o], *claimTriple[claimId2, s2, p, o], claimId1 < claimId2, predicate = 'p,o'
shareSubjectObject[claimId1, claimId2, predicate] := not shareTriple[claimId1, claimId2, x], *claimTriple[claimId1, s, p1, o], *claimTriple[claimId2, s, p2, o], claimId1 < claimId2, predicate = 's,o'

unnamedEdge[claimId1, claimId2, predicate] :=
  shareTriple[claimId1, claimId2, predicate] or
  shareSubjectPredicate[claimId1, claimId2, predicate] or
  sharePredicateObject[claimId1, claimId2, predicate] or
  shareSubjectObject[claimId1, claimId2, predicate]


namedEdge[claimId1, claimTitle1, claimId2, claimTitle2,predicate] := unnamedEdge[claimId1, claimId2, predicate], *claim{claimId: claimId1, claimTitle: claimTitle1}, *claim{claimId: claimId2, claimTitle: claimTitle2}
namedEdgeV2[claimId1, claimTitle1, claimId2, claimTitle2, collect(predicate)] := namedEdge[claimId1, claimTitle1, claimId2, claimTitle2, predicate ]
?[claimId1, claimTitle1, claimId2, claimTitle2, collectedPredicates] := namedEdgeV2[claimId1, claimTitle1, claimId2, claimTitle2, collectedPredicates]

    `
    )
    .catch((e) => console.log(e?.display ?? e))
    .then((res) => {
      return res.rows.map((row: string[]) => ({
        source: row[0],
        sourceTitle: row[1],
        target: row[2],
        targetTitle: row[3],
        predicate: row[4],
      }));
    });

  console.log(performance.measure("t", "start").duration.toFixed(2));
  return;

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

  await writeFile(`./data/graph-viz-export.json`, JSON.stringify({ nodes, predicateEdges, similarityEdges, claimToClaimEdge }, null, 2));
}
