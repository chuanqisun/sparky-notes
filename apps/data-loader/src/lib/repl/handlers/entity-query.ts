import type { CozoDb } from "cozo-node";
import { bulkEmbed } from "../../hits/bulk-embed";

export async function entityQueryHandler(db: CozoDb, command: string) {
  // if (!command.startsWith("e:")) return;

  const query = command.replace("e:", "").trim();
  // TODO implement minimum query interpreter
  const keywords = query.split(",").map((k) => k.trim());

  console.log(`🤖 Query expansion for [${keywords.join(", ")}]`);
  console.log(await Promise.all(keywords.map((keyword) => keywordToEntites(db, keyword))));

  const rawResult = await db
    .run(
      `
    hardEdge[hard_from, hard_to, dist] :=
      *claimTriple{s: hard_from, o: hard_to} or
      *claimTriple{s: hard_to, o: hard_from},
      dist = 0.3

    entitySimilarityEdge[sim_from, sim_to, dist] :=
      *entity:semantic{layer: 0, fr_text: sim_from, to_text: sim_to, dist}, dist < 0.2

    allEdges[from, to, dist] := 
      hardEdge[from, to, dist] or
      entitySimilarityEdge[from, to, dist]


    starting[] <- [['Azure']]
    goal[] <- [['Windows']]

    ?[starting, goal, distance, path] <~ KShortestPathYen(allEdges[], starting[], goal[], k: 10)
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
      const isSimilarEntityPair = await isSimilar(db, 0.2, fromE, toE);

      minigraph.push(...forwardPredicates.map((p) => `(${fromE})-[${p}]->(${toE})`));
      minigraph.push(...backwardPredicates.map((p) => `(${toE})-[${p}]->(${fromE})`));
      minigraph.push(...(isSimilarEntityPair ? [`(${fromE})-[similar to]->(${toE})`] : []));
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
}

async function keywordToEntites(db: CozoDb, keyword: string): Promise<string[]> {
  // keyword to vec
  const [vec] = await bulkEmbed([keyword]);

  // vector search nearest neighbors

  await db
    .run(
      `
?[text, dist] := ~entity:semantic{text | query: vec($vec), k: 10, ef: 16, bind_distance: dist, radius: 0.2 }

:sort dist
  `,
      {
        vec,
      }
    )
    .then(console.log)
    .catch((e) => console.log(e?.display ?? e));

  return [];
}

async function isSimilar(db: CozoDb, threshold: number, fromE: string, toE: string): Promise<Boolean> {
  const dist = await getL2Distance(db, fromE, toE);
  return dist === null ? false : dist < threshold;
}

async function getL2Distance(db: CozoDb, fromText: string, toText: string): Promise<number | null> {
  const result = await db
    .run(
      `
?[dist] := *entity { text: $fromText, vec: from }, *entity { text: $toText, vec: to }, dist = l2_dist(from, to) 

:limit 10
`,
      {
        fromText,
        toText,
      }
    )
    .then((res) => (res.rows[0]?.[0] as number) ?? null)
    .catch((e) => {
      console.log(e?.display ?? e);
      return null;
    });

  return result;
}
