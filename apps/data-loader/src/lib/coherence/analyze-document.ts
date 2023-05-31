import { assert } from "console";
import { appendFile, mkdir, readFile, readdir, writeFile } from "fs/promises";
import { getLengthSensitiveChatProxy, getLoadBalancedChatProxyV2, getSimpleChatProxy, type ChatMessage, type SimpleChatProxy } from "../azure/chat";
import { EntityName } from "../hits/entity";
import { responseToList } from "../hits/format";
import { getClaimIndexProxy, getSemanticSearchInput } from "../hits/search-claims";

interface RankedQA {
  query: string;
  responses: ClaimItem[];
}

interface ClaimItem {
  id: string;
  entityType: number;
  title: string;
  score: number;
  caption: string;
}

interface AggregatedItem extends ClaimItem {
  queries: string[];
}

export async function analyzeDocument(dir: string, outDir: string) {
  assert(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required");
  assert(process.env.HITS_UAT_SEARCH_API_KEY, "HITS_UAT_SEARCH_API_KEY is required");

  mkdir(outDir, { recursive: true });

  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v3.5-turbo");
  const shortChatProxy = getSimpleChatProxy(process.env.OPENAI_DEV_API_KEY!, "v4-8k");
  const longChatProxy = getSimpleChatProxy(process.env.OPENAI_DEV_API_KEY!, "v4-32k");
  const balancerChatProxy = getLoadBalancedChatProxyV2(shortChatProxy, longChatProxy);
  const allInOneProxy = getLoadBalancedChatProxyV2(chatProxy, shortChatProxy, longChatProxy);
  const claimSearchProxy = getClaimIndexProxy(process.env.HITS_UAT_SEARCH_API_KEY!);

  // PROD - GPT4 only
  // const lengthSensitiveProxy = getLengthSensitiveChatProxy(balancerChatProxy, longChatProxy, 7000);

  // PERF mode - Multi-thread
  const lengthSensitiveProxy = getLengthSensitiveChatProxy(allInOneProxy, longChatProxy, 7000);

  // DEBUG only - GPT3.5 only
  // const lengthSensitiveProxy = getLengthSensitiveChatProxy(chatProxy, longChatProxy, 7000);

  const documentToClaims = getSemanticQueries.bind(null, lengthSensitiveProxy);
  const documentToPattern = getPatternDefinition.bind(null, lengthSensitiveProxy);

  const filenames = await readdir(dir);
  const allFileLazyTasks = filenames.map((filename, i) => async () => {
    // TODO Length sensitivity should account for max token limit
    // TODO add all models to load balancer
    // TODO generate more queries to improve coverage
    // TODO handle empty ref list
    // TODO combine semantic search with keyword search for better coverage
    // TODO use agent to generate queries
    // TODO ensure unused claims are still categorized under "other"
    // TODO infer industry wide common names e.g. from Main-Details to Master-Details
    // TODO programmatic output for site building

    // start logging

    const logger = (topic: string, message: string) => {
      appendFile(
        `${outDir}/${filename}.log`,
        `
${new Date().toLocaleString} | ${topic}
${message}
`
      );
    };

    logger("main", "started");
    console.log(`[${filename}] Started`);
    const markdownFile = await readFile(`${dir}/${filename}`, "utf-8");

    const [pattern, queries] = await Promise.all([documentToPattern(markdownFile), documentToClaims(markdownFile)]);
    const { patternName, definition } = pattern;
    console.log(`[${filename}] Parsed`);
    console.log({ ...pattern, queries });

    const rankedResults: RankedQA[] = [];

    for (const query of queries) {
      const result = await claimSearchProxy(getSemanticSearchInput(query, 10));
      const responses = result.value
        ?.filter((doc) => doc["@search.rerankerScore"] > 1)
        ?.map((doc) => ({
          id: doc.ClaimId,
          entityType: doc.ClaimType,
          title: doc.ClaimTitle,
          score: doc["@search.rerankerScore"],
          caption: doc["@search.captions"].map((item) => item.text).join("..."),
        }));

      console.log(`Query: ${query} | ${responses?.length ?? 0} results`);
      rankedResults.push({ query, responses: responses ?? [] });
    }
    const positiveQ = rankedResults.filter((item) => item.responses.length > 0);
    const negativeQ = rankedResults.filter((item) => item.responses.length === 0);
    logger("search", `semantic search ${positiveQ} positive queries, ${negativeQ} negative queries`);

    await writeFile(`${outDir}/${filename}.json`, JSON.stringify(rankedResults, null, 2));

    const aggregated = rankedResults
      .flatMap((item) => item.responses.map((res) => ({ ...res, queries: [item.query] })))
      .reduce(groupById, [])
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // prevent overflow

    await writeFile(`${outDir}/${filename}-aggregated.json`, JSON.stringify(aggregated, null, 2));
    logger("search", `aggregation ${aggregated.length} items`);

    console.log(`[${filename}] Searched`);

    const relatedIds = await filterClaims(lengthSensitiveProxy, patternName, definition, aggregated);
    const filteredAggregated = aggregated.filter((item) => relatedIds.includes(item.id));

    const filteredClaimList = filteredAggregated.map((item, index) => `[${index + 1}] ${item.caption}`).join("\n");
    await writeFile(`${outDir}/${filename}-filtered-ref-list.txt`, filteredClaimList);
    logger("filter", `Source: ${aggregated.length}, Ids: ${relatedIds.length} -> Result: ${filteredAggregated.length}`);

    console.log(`[${filename}] Filtered`);

    const { summary, footnotes } = await curateClaims(lengthSensitiveProxy, patternName, filteredAggregated);
    logger("curation", `Topics: ${summary.length}, Footnotes: ${footnotes.length}}`);

    await writeFile(`${outDir}/${filename}-curated-research.json`, JSON.stringify({ summary, footnotes }, null, 2));

    const formattedPage = `
# ${patternName}
   
## Research insights
${summary
  .map((category) =>
    `
- ${category.name}
${category.claims.map((claim) => `  - ${claim.guidance} ${claim.sources.map((source) => `[${source.pos}]`).join("")}`).join("\n")}
    `.trim()
  )
  .join("\n")}

## References
${footnotes.map((item) => `${item.pos}. [${item.title}](${item.url})`).join("\n")}
      `.trim();

    await writeFile(`${outDir}/${filename}-curated-research.md`, formattedPage);
    console.log(`[${filename}] Done`);
  });

  // remove quotation marks in semantic queries
  // serial execution for debugging
  // await allFileLazyTasks.reduce(reducePromisesSerial, Promise.resolve());
  // parallel execution
  await Promise.all(allFileLazyTasks.map((lazyTask) => lazyTask()));
}

async function curateClaims(chatProxy: SimpleChatProxy, pattern: string, aggregatedItems: AggregatedItem[]) {
  const allFootNotes = aggregatedItems.map((item, index) => ({
    pos: index + 1,
    title: item.title,
    url: `https://hits.microsoft.com/${EntityName[item.entityType]}/${item.id}`,
  }));
  const textSources = aggregatedItems.map((item, index) => `[${index + 1}] ${item.caption}`).join("\n");
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Summarize all the findings about the "${pattern}" concept into a 3-5 categories of guidances. Uncategorizable claims must be grouped under "Other". Rephrase each finding as a guidance. Cite the source for each finding. Use format:

- <Category name 1>
   - <Guidance 1> [Citation #]
   - <Guidance 2> [Citation #]
- <Category name 2>
...
- Other
  - <Other Guidance>
  ...`,
    },
    {
      role: "user",
      content: textSources,
    },
  ];

  const response = await chatProxy({ messages, max_tokens: 800, temperature: 0 });
  const textResponse = response.choices[0].message.content ?? "";

  const categories: {
    name: string;
    claims: {
      guidance: string;
      sources: { pos: number; url: string; title: string }[];
    }[];
  }[] = [];

  const lines = textResponse.split("\n");
  const categoryLineIndices = lines.map((line, index) => (line.startsWith("- ") ? index : -1)).filter((i) => i !== -1);
  for (let i = 0; i < categoryLineIndices.length; i++) {
    const categoryLineIndex = categoryLineIndices[i];
    const categoryName = lines[categoryLineIndex].replace("- ", "").trim();
    const citedClaims = lines
      .slice(categoryLineIndex + 1, categoryLineIndices[i + 1] ?? lines.length)
      .map((line) => {
        const match = line.trim().match(/^- (.*) ((\[(\d+)\])+)$/);
        if (!match) {
          return null;
        }
        const sourcePos = match[2].match(/\[(\d+)\]/g)?.map((item) => parseInt(item.replace("[", "").replace("]", ""))) ?? [];
        const sources = sourcePos.map((pos) => allFootNotes.find((item) => item.pos === pos)!).filter(Boolean);
        const guidance = match[1].trim();
        return { guidance, sources };
      })
      .filter(Boolean) as { guidance: string; sources: { pos: number; url: string; title: string }[] }[];

    if (citedClaims.length) {
      categories.push({ name: categoryName, claims: citedClaims });
    }
  }

  const unusedFootnotes = allFootNotes.filter(
    (item) => !categories.some((category) => category.claims.some((claim) => claim.sources.some((source) => source.pos === item.pos)))
  );
  if (unusedFootnotes.length) {
    console.error("UNUSED FOOTNOTE FOUND", unusedFootnotes);
  }
  return { summary: categories, footnotes: allFootNotes };
}

async function getPatternDefinition(chatProxy: SimpleChatProxy, markdownFile: string) {
  const patternName = getPatternName(markdownFile);

  const response = await chatProxy({
    messages: [
      {
        role: "system",
        content: `
Define the concept called "${patternName}" based on the document. Respond with one sentence. Use format

Concept: ${patternName}
Definition: <One sentence definition>
`.trim(),
      },
      { role: "user", content: markdownFile },
    ],
    max_tokens: 300,
    temperature: 0,
  });

  const textResponse = response.choices[0].message.content ?? "";

  const definition = textResponse.match(/Definition: (.*)/)?.[1] ?? "";
  return { patternName, definition };
}

function getPatternName(markdownFile: string) {
  return markdownFile.match(/# (.*)/)?.[1] ?? "";
}

async function getSemanticQueries(chatProxy: SimpleChatProxy, markdownFile: string) {
  const claims = await chatProxy({
    messages: [
      {
        role: "system",
        content: `You are a researcher assistant. The user will provide a document. You must generate a list of 20 semantic search queries for any evidence that supports or contradicts the document. Cover as many different angles as possible. Respond in bullet list. Use format:
- "<query 1>"
- "<query 2>"
...
          `,
      },
      { role: "user", content: markdownFile },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const listItems = responseToList(claims.choices[0].message.content ?? "").listItems;

  // remove surrounding quotation marks
  const queries = listItems.map((item) => item.replace(/^"(.*)"$/, "$1"));
  return queries;
}

interface FilterableClaim {
  id: string;
  caption: string;
}
async function filterClaims(chatProxy: SimpleChatProxy, pattern: string, definition: string, claims: FilterableClaim[]) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
Determine which of the provided claims mentioned the concept "${pattern}":

${definition}

Response with a list of ${claims.length} items. Each item must use this format:

Claim 1
Id: <Claim id>
Reason: <Identify any mentions of the concept "App frame">
Answer: <Yes/No>

Claim 2
...
`.trim(),
    },
    {
      role: "user",
      content: `
${claims
  .map((claim) =>
    `
Id: ${claim.id}
Claim: ${claim.caption} 
`.trim()
  )
  .join("\n\n")}      
`.trim(),
    },
  ];

  const filterResponse = await chatProxy({
    messages,
    max_tokens: 2000,
    temperature: 0,
  });

  const responseText = filterResponse.choices[0].message.content ?? "";
  const idReasonAnswerTuples = responseText.matchAll(/Id: (.*)\nReason: (.*)\nAnswer: (.*)/gm) ?? [];
  const filteredClaimIds = [...idReasonAnswerTuples]
    .map(([, id, reason, answer]) => ({ id, reason, answer }))
    .filter((item) => item.answer.toLocaleLowerCase() === "yes")
    .map((item) => item.id);

  return filteredClaimIds;
}

function groupById(acc: AggregatedItem[], item: AggregatedItem) {
  const existing = acc.find((i) => i.id === item.id);
  if (existing) {
    if (existing.score < item.score) {
      existing.score = item.score;
      existing.queries.push(...item.queries);
    }
  } else {
    acc.push(item);
  }
  return acc;
}

function reducePromisesSerial(acc: Promise<any>, item: () => Promise<any>) {
  return acc.then(item);
}
