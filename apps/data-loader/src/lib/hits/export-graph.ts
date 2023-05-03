import type { CozoDb } from "cozo-node";

export async function exportGraph(db: CozoDb) {
  const result = await db.run(`
{
  predicateEdge[s, o] := *claimTriple{claimId, s, p, o}
  :limit 5
}`);

  console.log(result);
}
