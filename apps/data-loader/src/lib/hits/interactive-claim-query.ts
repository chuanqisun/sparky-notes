import type { CozoDb } from "cozo-node";
import { writeFile } from "fs/promises";
import { getSimpleChatProxy, type ChatMessage } from "../azure/chat";
import { bulkEmbed } from "./bulk-embed";
import { parseClaimQuery } from "./parse-claims";

export async function semantcQueryHandler(db: CozoDb, command: string) {
  // query expansion
  console.log(`🤖 Conceptualizing...`);
  const concepts = await parseClaimQuery(command);
  concepts.map((concept) => console.log(`🧠 Concept: ${concept}`));

  // embedding parser
  console.log(`🤖 Vectorizing...`);
  await bulkEmbed(concepts).then(async (embeddings) => {
    console.log(`🤖 Affinitizing known concepts...`);

    const conceptsGrid = await Promise.all(
      embeddings.map((embedding, index) => {
        return db
          .run(
            `?[id, text, dist, claim_id, claim_title, claim_root_title, claim_content, claim_root_content] :=
*concept{id, text}, 
~concept:semantic{text | query: vec($embedding), bind_distance: dist, k: 10, ef: 25},
dist < 0.35,
*claim_concept {conceptId: id, claimId: claim_id},
*claim {id: claim_id, title: claim_title, rootTitle: claim_root_title, content: claim_content, rootContent: claim_root_content}

:order dist
:limit 10
`,
            { embedding }
          )
          .then((result) =>
            result.rows.map((row: any) => ({
              userConcept: concepts[index],
              id: row[0],
              text: row[1],
              dist: row[2],
              claimId: row[3],
              claimTitle: row[4],
              claimRootTitle: row[5],
              claimContent: row[6],
              claimRootContent: row[7],
            }))
          )
          .catch((e) => console.error(e?.display ?? e));
      })
    );

    const flatConceptList = conceptsGrid.flat().sort((a, b) => a.dist - b.dist) as {
      userConcept: string;
      id: string;
      text: string;
      dist: number;
      claimId: string;
      claimTitle: string;
      claimRootTitle: string;
      claimContent: string;
      claimRootContent: string;
    }[];

    // aggregate duplicate concepts by frequency
    const aggregatedList = flatConceptList.reduce((acc, concept) => {
      const existingConcept = acc.find((c) => c.id === concept.id);

      if (existingConcept) {
        existingConcept.frequency++;
        existingConcept.dist = Math.min(existingConcept.dist, concept.dist);
      } else {
        acc.push({ ...concept, frequency: 1 });
      }

      return acc;
    }, [] as { userConcept: string; id: string; text: string; dist: number; claimId: string; claimTitle: string; claimRootTitle: string; claimContent: string; claimRootContent: string; frequency: number }[]);

    const frequencyAdjustedList = aggregatedList.map((item) => {
      return { ...item, freqDist: item.dist * Math.pow(0.8, item.frequency - 1) };
    });

    // sort by frequency then distance
    const sortedList = frequencyAdjustedList.sort((a, b) => {
      return a.freqDist - b.freqDist;
    });

    console.log(`🤖 Prioritizing findings...`);

    const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v4-8k", true);

    let outputLines = "";

    const logAndWrite = (line: string) => {
      outputLines += line + "  \n";
      console.log(line);
    };

    for (let item of sortedList) {
      const reasonMessages: ChatMessage[] = [
        {
          role: "system",
          content: `
You are a UX researcher working at Microsoft. You have profound domain knowledge in user experience research. You are analyzing the following question:
${command}

The user will provide a specific claim from an existing research report. You must use the claim to answer the question. Use the following format:
Analysis: <Analyze the key concept in the question and the claim>
Final answer: <Answer the original question>
        `.trim(),
        },
        {
          role: "user",
          content: `
Claim source report: ${item.claimRootTitle}
Claim title: ${item.claimTitle}
Claim details: ${item.claimContent}
Key concept in the claim: ${item.text}
Key concept in the question: ${item.userConcept}

Now answer the Question: ${command}
        `.trim(),
        },
      ];

      logAndWrite(`🤖 ${sortedList.indexOf(item) + 1} of ${sortedList.length}...`);
      const result = (await chatProxy({ messages: reasonMessages, max_tokens: 600 }).then((response) => response.choices[0].message.content)) ?? "";

      const answer = result.match(/final\s+answer\:\s+(.+)/i)?.[1] ?? "";
      const reason = result.match(/analysis\:\s+(.+)/i)?.[1] ?? "";

      if (answer && reason) {
        logAndWrite(`💡 ${answer}`);
        logAndWrite(`🧠 ${reason}`);
        logAndWrite(`📋 Source: ${item.claimRootTitle} | ${item.claimTitle}`);
        logAndWrite(`🔗 https://hits.microsoft.com/insight/${item.claimId}`);
      } else {
        logAndWrite(`⚠️ Human analysis required`);
        logAndWrite(`📋 Source: ${item.claimRootTitle} | ${item.claimTitle}`);
        logAndWrite(`🔗 https://hits.microsoft.com/insight/${item.claimId}`);
      }

      logAndWrite(`\n---\n`);

      await writeFile(`./data/repl-query-${Date.now()}.md`, outputLines).catch();
    }
  });
}
