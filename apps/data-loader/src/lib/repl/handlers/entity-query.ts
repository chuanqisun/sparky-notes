import type { CozoDb } from "cozo-node";
import { appendFile } from "fs/promises";
import path from "path";
import { getLoadBalancedChatProxy, type ChatMessage } from "../../azure/chat";
import { bulkGetEmbeddings } from "../../hits/bulk-embed";
import { PUT_ENTITY } from "../../hits/cozo-scripts/cozo-scripts";

export async function entityQueryHandler(db: CozoDb, command: string) {
  // if (!command.startsWith("e:")) return;

  const query = command.replace("e:", "").trim();
  // TODO implement minimum query interpreter

  const [fromKeywords, toKeywords] = query
    .split("->")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) =>
      part
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    );

  if (!fromKeywords?.length || !toKeywords?.length) {
    console.log(`❌ Invalid format. Pattern: "e: <keyword>, <keyword> -> <keyword>, <keyword>"`);
    return;
  }

  const allKeywords = [...new Set([...fromKeywords, ...toKeywords])];

  // todo boost perf with cache
  console.log(`🤖 Update embeddings [${allKeywords.join(", ")}]`);
  const entities = await bulkGetEmbeddings(allKeywords);

  for (const entity of entities) {
    await db.run(PUT_ENTITY, {
      text: entity.text,
      vec: entity.vec,
    });
  }

  console.log(`🤖 Ontology graph analysis`);
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


    sourceNodes[] <- [$sourceNodes]
    targetNodes[] <- [$targetNodes]

    ?[sourceNodes, targetNodes, distance, path] <~ KShortestPathYen(allEdges[], sourceNodes[], targetNodes[], k: 10)
  `,
      {
        sourceNodes: fromKeywords,
        targetNodes: toKeywords,
      }
    )
    .catch((e) => console.log(e?.display ?? e));

  const knownPath = new Set<string>();

  const logPath = path.resolve(`./data/repl-query-${Date.now()}.md`);
  await appendFile(logPath, `Query: \`[${fromKeywords.join(",")}] -> [${toKeywords.join(",")}]\`\n\n`).catch();

  for (const row of rawResult.rows) {
    const entities = row[3];
    const edges: PredicateEdge[] = [];

    for (let i = 0; i < entities.length - 1; i++) {
      const fromE = entities[i];
      const toE = entities[i + 1];
      const isSimilarEntityPair = await isSimilar(db, 0.2, fromE, toE);

      if (!isSimilarEntityPair) {
        const bidiEdges = await getBidiPredicateEdge(db, fromE, toE);
        edges.push(...bidiEdges);
      }
    }

    // dedupe the edges (due to multiple paths from similarity jumps)
    const pathId = edges.flatMap((item) => [item.subject, item.predicate, item.object]).join(",");
    if (knownPath.has(pathId)) continue;
    knownPath.add(pathId);

    console.log("---");

    // render to text
    const ontologyPath = formatEdgesAsGraph(edges);
    const claimIds = [...new Set(edges.map((item) => item.claimId))].join(",");
    const { reason, claim } = await interpretGraph(allKeywords, edges);
    console.log({
      insight: claim,
      reason,
      graph: ontologyPath,
      sources: claimIds,
    });
    await appendFile(
      logPath,
      `---
${claim}
${reason}
${ontologyPath}
${claimIds}\n\n`
    );
  }
}

export function formatEdgesAsGraph(edges: PredicateEdge[]) {
  return edges.map((item) => `${item.subject}-[${item.predicate}]->${item.object}`).join("\n");
}

export function formatEdgesAsClaims(edges: PredicateEdge[]) {
  return edges.map((item) => `${item.claimTitle}\n${item.claimContent}`).join("\n\n");
}

export async function interpretGraph(terminalConcepts: string[], edges: PredicateEdge[]) {
  const chatProxy = getLoadBalancedChatProxy(process.env.OPENAI_API_KEY!, ["v4-8k", "v4-32k"], true);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
You are an ontological engineer with UX Research and Design domain expertise. Summary a knowledge graph into a new claim. You should rely on the provided claims as reference.

Use this format:

Reason: <describe any deductive and inductive reasonings based on the graph>
New claim: <describe the new claim based on the reason>
        `.trim(),
    },
    {
      role: "user",
      content: `
Focused concepts: ${terminalConcepts.join(", ")}

Knowledge graph:
${formatEdgesAsGraph(edges)}

Reference claims:
${formatEdgesAsClaims(edges)}
      `.trim(),
    },
  ];

  const response = await chatProxy({ messages, temperature: 0, max_tokens: 600 });
  const textResponse = response.choices[0].message.content ?? "";

  const reason = textResponse.match(/Reason: (.*)/)?.[1]?.trim();
  const claim = textResponse.match(/New claim: (.*)/)?.[1]?.trim();

  return {
    reason,
    claim,
  };
}

export interface OntologyGraphEdge {
  fromNode: string;
  toNode: string;
  type: "predicate" | "similarity";
  predicate?: string;
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

async function joinWithPredicateEdge(db: CozoDb, fromE: string, toE: string): Promise<string[]> {
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

interface PredicateEdge {
  claimId: string;
  claimTitle: string;
  claimContent: string;
  subject: string;
  predicate: string;
  object: string;
}
async function getBidiPredicateEdge(db: CozoDb, fromE: string, toE: string): Promise<PredicateEdge[]> {
  const raw = await db
    .run(
      `
    forwardEdge[claimId, from, p, to] := *claimTriple{claimId, s: $fromE, p, o: $toE}, from = $fromE, to = $toE
    backwardEdge[claimId, to, p, from] := *claimTriple{claimId, s: $toE, p, o: $fromE}, from = $fromE, to = $toE
    ?[from, p, to, claimId, claimTitle, claimContent] := forwardEdge[claimId, from, p, to] or backwardEdge[claimId, from, p, to], *claim{claimId, claimTitle, claimContent}
`,
      {
        fromE,
        toE,
      }
    )
    .catch((e) => console.log(e.display));

  return raw.rows.map((row: string[]) => ({
    subject: row[0],
    predicate: row[1],
    object: row[2],
    claimId: row[3],
    claimTitle: row[4],
  }));
}
