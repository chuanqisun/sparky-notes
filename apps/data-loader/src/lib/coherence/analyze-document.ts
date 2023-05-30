import { assert } from "console";
import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import type { ChatMessage } from "../azure/chat";
import { getSimpleChatProxy, type SimpleChatProxy } from "../azure/chat";
import { responseToList } from "../hits/format";
import { getClaimIndexProxy, getSemanticSearchInput } from "../hits/search-claims";

export async function analyzeDocument(dir: string, outDir: string) {
  assert(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required");
  assert(process.env.HITS_UAT_SEARCH_API_KEY, "HITS_UAT_SEARCH_API_KEY is required");

  mkdir(outDir, { recursive: true });

  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v3.5-turbo");
  const claimSearchProxy = getClaimIndexProxy(process.env.HITS_UAT_SEARCH_API_KEY!);
  const documentToClaims = getSemanticQueries.bind(null, chatProxy);

  const filenames = await readdir(dir);
  const allFileLazyTasks = filenames.map((filename, i) => async () => {
    console.log(`=== ${filename} ===`);
    const markdownFile = await readFile(`${dir}/${filename}`, "utf-8");

    const { patternName, definition } = await getPatternDefinition(chatProxy, markdownFile);
    console.log(`${patternName}: ${definition}`);

    const claims = await documentToClaims(markdownFile);
    console.log(claims);
    const queries = responseToList(claims).listItems;

    const rankedResults: { query: string; responses: { id: string; entityType: number; title: string; score: number; caption: string }[] }[] = [];

    for (const query of queries) {
      console.log(`Query: ${query}`);

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

      rankedResults.push({ query, responses: responses ?? [] });
    }

    await writeFile(`${outDir}/${filename}.json`, JSON.stringify(rankedResults, null, 2));

    const aggregated = rankedResults
      .flatMap((item) => item.responses.map((res) => ({ ...res, queries: [item.query] })))
      .reduce(groupById, [])
      .sort((a, b) => b.score - a.score);

    await writeFile(`${outDir}/${filename}-aggregated.json`, JSON.stringify(aggregated, null, 2));

    // TODO add a filter step to ensure mentioning of the component name
    const relatedIds = await filterClaims(chatProxy, patternName, definition, aggregated);
    const filteredAggregated = aggregated.filter((item) => relatedIds.includes(item.id));
    console.log(filteredAggregated.map((item) => `${item.id} ${item.caption}`).join("\n"));

    // TODO add token limit and chunking to long document

    await writeFile(`${outDir}/${filename}-aggregated-filtered.json`, JSON.stringify(filteredAggregated, null, 2));
  });

  await allFileLazyTasks.reduce(reducePromisesSerial, Promise.resolve());
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
        content:
          "You are a researcher assistant. The user will provide a document. You must generate a list of 10 semantic search queries for any evidence that supports or contradicts the document. Respond in bullet list",
      },
      { role: "user", content: markdownFile },
    ],
    max_tokens: 300,
    temperature: 0,
  });

  return claims.choices[0].message.content ?? "";
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

interface AggregatedItem {
  id: string;
  entityType: number;
  title: string;
  score: number;
  caption: string;
  queries: string[];
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
