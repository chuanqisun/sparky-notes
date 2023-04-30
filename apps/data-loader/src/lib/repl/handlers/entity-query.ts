import type { CozoDb } from "cozo-node";

export async function entityQueryHandler(db: CozoDb, command: string) {
  // if (!command.startsWith("e:")) return;

  const query = command.replace("e:", "").trim();
  // TODO implement minimum query interpreter

  const rawResult = await db
    .run(
      `
    hardEdge[hard_from, hard_to, dist] :=
      *claimTriple{s: hard_from, o: hard_to} or
      *claimTriple{s: hard_to, o: hard_from},
      dist = 0.3

    entitySimilarityEdge[sim_from, sim_to, dist] :=
      *entity:semantic{layer: 0, fr_text: sim_from, to_text: sim_to, dist}, dist < 0.1

    allEdges[from, to, dist] := 
      hardEdge[from, to, dist] or
      entitySimilarityEdge[from, to, dist]


#?[from, to, dist] := allEdges[from, to, dist], dist = 0.01

#?[sem_from, sem_to, dist] := semanticEdge[sem_from, sem_to, dist]

    starting[] <- [['Azure']]
    goal[] <- [['Windows']]

    ?[starting, goal, distance, path] <~ KShortestPathYen(allEdges[], starting[], goal[], k: 10)

:sort distance
:limit 10

  `
    )
    .catch((e) => console.log(e?.display ?? e));

  console.log(rawResult.rows.map((row: any[]) => [row[2], ...row[3]].join(",")));

  for (const row of rawResult.rows) {
    const entities = row[3];
    const minigraph = [];

    for (let i = 0; i < entities.length - 1; i++) {
      const fromE = entities[i];
      const toE = entities[i + 1];
      const forwardPredicates = await joinWithPredicateEdge(fromE, toE);
      const backwardPredicates = await joinWithPredicateEdge(toE, fromE);
      const similarityPairs = await joinWithSemanticEdge(fromE, toE);

      minigraph.push(...forwardPredicates.map((p) => `(${fromE})-[${p}]->(${toE})`));
      minigraph.push(...backwardPredicates.map((p) => `(${toE})-[${p}]->(${fromE})`));
      minigraph.push(...similarityPairs.map((p) => `(${p[0]})-[similar to]->(${p[1]})`));
    }

    console.log("---");
    console.log(minigraph.join("\n"));
  }

  async function joinWithPredicateEdge(fromE: string, toE: string): Promise<string[]> {
    const raw = await db.run(
      `
      hardEdge[s, o] <- [[$fromE, $toE]]
      ?[s, p, o] := *claimTriple{s, p, o}, hardEdge[s, o]
`,
      {
        fromE,
        toE,
      }
    );

    return raw.rows.map((row: string[]) => row[1]);
  }

  async function joinWithSemanticEdge(fromE: string, toE: string): Promise<[string, string][]> {
    const raw = await db.run(
      `
      semanticEdge[sem_from, sem_to] <- [[$fromE, $toE]]
      ?[sem_from, sem_to, dist] := semanticEdge[sem_from, sem_to], *entity:semantic{layer: 0, fr_text: sem_from, to_text: sem_to, dist}, dist < 0.1, sem_from < sem_to
`,
      {
        fromE,
        toE,
      }
    );

    return raw.rows.map((row: string[]) => [row[0], row[1]] as const);
  }
}
