import { assert } from "console";
import { appendFile, mkdir, readFile, readdir, writeFile } from "fs/promises";
import { getLengthSensitiveChatProxy, getLoadBalancedChatProxyV2, getSimpleChatProxy } from "../azure/chat";
import { getClaimIndexProxy, getSemanticSearchInput } from "../hits/search-claims";
import { curateClaims } from "./pipeline/curate-claims";
import { extractMarkdownTitle } from "./pipeline/extract-markdown-title";
import { filterClaims } from "./pipeline/filter-claims";
import { getPatternDefinition } from "./pipeline/infer-concept";
import { getSemanticQueries } from "./pipeline/infer-queries";
import { groupById, type RankedQA } from "./pipeline/semantic-search";

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
  // const lengthSensitiveProxy = getLengthSensitiveChatProxy(balancerChatProxy, longChatProxy, 8000);

  // PERF mode - Multi-thread
  // const lengthSensitiveProxy = getLengthSensitiveChatProxy(allInOneProxy, longChatProxy, 8000);

  // DEBUG only - GPT3.5 only
  const lengthSensitiveProxy = getLengthSensitiveChatProxy(chatProxy, longChatProxy, 8000);

  const documentToClaims = getSemanticQueries.bind(null, lengthSensitiveProxy);
  const documentToPattern = getPatternDefinition.bind(null, lengthSensitiveProxy);

  const filenames = await readdir(dir);
  const allFileLazyTasks = filenames.map((filename, i) => async () => {
    // TODO modular refactor
    // TODO explore multi-concept query expansion
    // TODO add all models to load balancer
    // TODO Add synonym to pattern definition
    // TODO generate more queries to improve coverage
    // TODO combine semantic search with keyword search for better coverage
    // TODO use agent to generate queries
    // TODO ensure unused claims are still categorized under "other"
    // TODO infer industry wide common names e.g. from Main-Details = Master-Details, Choice group = Radio button
    // TODO chunking long input document for GPT3.5 only deployments

    // start logging

    const logger = (...segments: string[]) => {
      appendFile(`${outDir}/${filename}.log`, `${[new Date().toISOString(), ...segments].join(" | ")}\n`);
    };

    logger("main", "started");
    console.log(`[${filename}] Started`);
    const markdownFile = await readFile(`${dir}/${filename}`, "utf-8");

    const pattern = extractMarkdownTitle(markdownFile);
    const [definition, queries] = await Promise.all([documentToPattern(pattern, markdownFile), documentToClaims(markdownFile)]);
    console.log(`[${filename}] Parsed`);
    console.log({ pattern, definition, queries });

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
    logger("search", `semantic search ${positiveQ.length} positive queries, ${negativeQ.length} negative queries`);

    await writeFile(`${outDir}/${filename}.json`, JSON.stringify({ rankedResults }, null, 2));

    const aggregated = rankedResults
      .flatMap((item) => item.responses.map((res) => ({ ...res, queries: [item.query] })))
      .reduce(groupById, [])
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // prevent overflow

    await writeFile(`${outDir}/${filename}.json`, JSON.stringify({ aggregated, rankedResults }, null, 2));
    logger("search", `aggregation ${aggregated.length} items`);

    console.log(`[${filename}] Searched`);

    const relatedIds = await filterClaims(lengthSensitiveProxy, pattern, definition, aggregated);
    const filteredAggregated = aggregated.filter((item) => relatedIds.includes(item.id));

    const filteredClaimList = filteredAggregated.map((item, index) => `[${index + 1}] ${item.caption}`);
    await writeFile(`${outDir}/${filename}.json`, JSON.stringify({ filteredClaimList, aggregated, rankedResults }, null, 2));
    logger("filter", `Source: ${aggregated.length}, Ids: ${relatedIds.length} -> Result: ${filteredAggregated.length}`);

    console.log(`[${filename}] Filtered`);

    const { summary, footnotes, unusedFootnotes } = await curateClaims(lengthSensitiveProxy, pattern, filteredAggregated);
    const footnoteUtilization = (footnotes.length - unusedFootnotes.length) / footnotes.length;
    const groupCount = summary.length;
    const claimCount = summary.flatMap((topic) => topic.claims).length;
    const guidanceDensity = claimCount / groupCount;
    const refDensity = (footnotes.length - unusedFootnotes.length) / groupCount;

    logger(
      "curation",
      `Topics: ${groupCount}, Claims: ${claimCount}, Footnotes: ${footnotes.length}, Utilization: ${footnoteUtilization}, Guidance density: ${guidanceDensity}, Ref density: ${refDensity}`
    );

    await writeFile(`${outDir}/${filename}-result.json`, JSON.stringify({ summary, footnotes }, null, 2));

    const formattedPage = `
# ${pattern}
   
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
  await allFileLazyTasks.reduce(reducePromisesSerial, Promise.resolve());
  // parallel execution
  // await Promise.all(allFileLazyTasks.map((lazyTask) => lazyTask()));
}

function reducePromisesSerial(acc: Promise<any>, item: () => Promise<any>) {
  return acc.then(item);
}
