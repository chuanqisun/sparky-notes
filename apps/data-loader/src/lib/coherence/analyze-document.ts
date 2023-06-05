import { assert } from "console";
import { appendFile, mkdir, readFile, readdir, writeFile } from "fs/promises";
import { getLengthSensitiveChatProxy, getLoadBalancedChatProxyV2, getSimpleChatProxy } from "../azure/chat";
import { getClaimIndexProxy } from "../hits/search-claims";
import { curateClaims } from "./pipeline/curate-claims";
import { extractMarkdownTitle } from "./pipeline/extract-markdown-title";
import { filterClaims } from "./pipeline/filter-claims";
import {
  curateClaimsV2,
  getConcept,
  getGuidance,
  getQuestions,
  inferProtesters,
  inferSupporters,
  inferUserGoals,
  inferUserProblems,
  questionToConcepts,
} from "./pipeline/inference";
import { parseCuration } from "./pipeline/parse-curation";
import { decorateQuery } from "./pipeline/reflect";
import { bulkSemanticQuery, groupById } from "./pipeline/semantic-search";

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
  const lengthSensitiveProxyGpt4 = getLengthSensitiveChatProxy(balancerChatProxy, longChatProxy, 8000);

  // PERF mode - Multi-thread
  // const lengthSensitiveProxy = getLengthSensitiveChatProxy(allInOneProxy, longChatProxy, 8000);

  // DEBUG only - GPT3.5 only
  const lengthSensitiveProxy = getLengthSensitiveChatProxy(chatProxy, longChatProxy, 8000);

  const startTime = Date.now();
  const filenames = await readdir(dir);
  const allFileLazyTasks = filenames.map((filename, i) => async () => {
    // TODO rename dos and donts into "best practice"
    // TODO output study title and some metadata ala wikipedia footnote style
    // TODO reinforcement semantic search query expansion
    // TODO persona based semantic search query expansion
    // TODO cache semantic search results to reduce cost
    // TODO "text [#]." citation is not supported (GPT-4 specific)
    // TODO handle untitled section in source document
    // TODO modular refactor
    // TODO align filenaming convention with coherence package
    // TODO explore multi-concept query expansion
    // TODO add all models to load balancer
    // TODO itemized filter to prevent momentum
    // TODO Add synonym to pattern definition
    // TODO generate more queries to improve coverage
    // TODO combine semantic search with keyword search for better coverage
    // TODO use agent to generate queries
    // TODO ensure unused claims are still categorized under "other"
    // TODO infer industry wide common names e.g. from Main-Details = Master-Details, Choice group = Radio button
    // TODO chunking long input document for GPT3.5 only deployments

    // start logging

    const logger = async (...segments: string[]) => {
      const message = `${[new Date().toISOString(), filename, ...segments].join(" | ")}`;
      console.log(`${filename} | ${message}`);
      await appendFile(`${outDir}/${startTime}.log`, `${message}\n`);
    };

    const progressObject: {
      pattern: any;
      concept: any;
      guidance: any;
      goals: any;
      problems: any;
      supporters: any;
      protesters: any;
      questions: any;
      questionedConcepts: any;
      rankedResults: any;
      curationResponse: any;
      curationParsed: any;
    } = {} as any;

    const incrementalLogObject = async (additionalField: any) => {
      Object.assign(progressObject, additionalField);
      await writeFile(`${outDir}/${filename}.json`, JSON.stringify(progressObject, null, 2));
    };

    const resumeOrRun = async <T>(flag: boolean, value: any, fn: () => Promise<T> | T) => {
      const shouldResume = flag && !!value;

      return (shouldResume ? value : await fn()) as T;
    };

    // control which steps should be resumed from last run
    // set to false will force a fresh run the step
    const resumeGetConcept = true;
    const resumeGetGuidance = true;
    const resumeGetQuestions = true;
    const resumeInferGoals = true;
    const resumeInferProblems = true;
    const resumeInferSupporters = true;
    const resumeInferProtesters = true;
    const resumeQuestionToConcepts = true;
    const resumeSemanticSearch = true;
    const resumeCurationReponse = true;
    const resumeCurationParsed = true;

    await logger("main", "started");
    // resume progress from disk
    try {
      await readFile(`${outDir}/${filename}.json`, "utf-8").then((content) => {
        Object.assign(progressObject, JSON.parse(content));
      });

      await logger("main", `resumed: ${Object.keys(progressObject).join(",")}`);
    } catch (e) {
      console.log(`Cannot resume progress for ${filename}`);
    }

    const markdownFile = await readFile(`${dir}/${filename}`, "utf-8");

    const pattern = extractMarkdownTitle(markdownFile);
    const [concept, guidance, questions] = await Promise.all([
      resumeOrRun(resumeGetConcept, progressObject.concept, () => getConcept(lengthSensitiveProxy, markdownFile)),
      resumeOrRun(resumeGetGuidance, progressObject.guidance, () => getGuidance(lengthSensitiveProxy, markdownFile)),
      resumeOrRun(resumeGetQuestions, progressObject.questions, () => getQuestions(lengthSensitiveProxy, markdownFile, 20)),
    ]);

    await incrementalLogObject({ pattern, concept, guidance, questions });

    const [questionedConcepts, goals, problems, supporters, protesters] = await Promise.all([
      resumeOrRun(resumeQuestionToConcepts, progressObject.questionedConcepts, () => questionToConcepts(chatProxy, questions)),
      resumeOrRun(resumeInferGoals, progressObject.goals, () => inferUserGoals(chatProxy, concept.name, concept.definition, concept.alternativeNames)),
      resumeOrRun(resumeInferProblems, progressObject.problems, () => inferUserProblems(chatProxy, concept.name, concept.definition, concept.alternativeNames)),
      resumeOrRun(resumeInferSupporters, progressObject.supporters, () =>
        inferSupporters(chatProxy, concept.name, concept.definition, concept.alternativeNames)
      ),
      resumeOrRun(resumeInferProtesters, progressObject.protesters, () =>
        inferProtesters(chatProxy, concept.name, concept.definition, concept.alternativeNames)
      ),
    ]);

    await incrementalLogObject({ questionedConcepts, goals, problems, supporters, protesters });

    const allQueries = [
      concept.name,
      ...concept.alternativeNames,
      ...questionedConcepts,
      ...goals,
      ...problems,
      ...supporters,
      ...protesters,
      ...guidance.dos,
      ...guidance.donts,
    ];
    await logger("search", `semantic search ${allQueries.length} total queries`);
    const rankedResults = await resumeOrRun(resumeSemanticSearch, progressObject.rankedResults, () => bulkSemanticQuery(claimSearchProxy, allQueries, 10, 1));

    const positiveQ = rankedResults.filter((item) => item.responses.length > 0);
    const negativeQ = rankedResults.filter((item) => item.responses.length === 0);
    await logger("search", `semantic search ${positiveQ.length} positive queries, ${negativeQ.length} negative queries`);
    incrementalLogObject({ rankedResults });

    const aggregated = rankedResults
      .flatMap((item) =>
        item.responses.map((res) => ({ ...res, queries: [{ raw: item.query, decorated: decorateQuery(progressObject, concept.name, item.query) }] }))
      )
      .reduce(groupById, [])
      .sort((a, b) => b.score - a.score)
      .slice(0, 30); // prevent overflow

    // analyze aggregation quality with top, avg, bottom scores
    const allScores = aggregated.map((item) => item.score);
    const topScore = Math.max(...allScores);
    const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const bottomScore = Math.min(...allScores);
    await logger("search", `aggregation ${aggregated.length} items. Score top ${topScore}, avg ${avgScore}, bottom ${bottomScore}`);
    incrementalLogObject({ aggregated });

    const curationResponse = await resumeOrRun(resumeCurationReponse, progressObject.curationResponse, () =>
      curateClaimsV2(lengthSensitiveProxy, concept, aggregated)
    );
    await logger("curate", `curation ${curationResponse.length} chars`);
    incrementalLogObject({ curationResponse });

    const parsedCuration = await resumeOrRun(resumeCurationParsed, progressObject.curationParsed, () => parseCuration(aggregated, curationResponse));
    const footnoteUtilizationRate = parsedCuration.usedFootNotePositions.length / parsedCuration.footNotes.length;
    const citationsPerItem =
      parsedCuration.groups.reduce((a, b) => a + b.items.reduce((x, y) => x + y.sources.length, 0), 0) /
      parsedCuration.groups.reduce((a, b) => a + b.items.length, 0);
    await logger(
      "curate",
      `groups: ${parsedCuration.groups.length}, footnotes: ${parsedCuration.footNotes.length}, source utilization: ${footnoteUtilizationRate}, citation per item: ${citationsPerItem}, invalid: ${parsedCuration.unknownFootNotePositions.length}}`
    );
    incrementalLogObject({ parsedCuration });

    // debug
    return;

    const relatedIds = await filterClaims(lengthSensitiveProxy, pattern, concept.definition, aggregated);
    const filteredAggregated = aggregated.filter((item) => relatedIds.includes(item.id));

    const filteredClaimList = filteredAggregated.map((item, index) => `[${index + 1}] ${item.caption}`);
    // await writeFile(`${outDir}/${filename}.json`, JSON.stringify({ filteredClaimList, aggregated, rankedResults }, null, 2));
    await logger("filter", `Source: ${aggregated.length}, Ids: ${relatedIds.length} -> Result: ${filteredAggregated.length}`);

    const { summary, footnotes, unusedFootnotes } = await curateClaims(lengthSensitiveProxyGpt4, pattern, filteredAggregated);
    const footnoteUtilization = (footnotes.length - unusedFootnotes.length) / footnotes.length;
    const groupCount = summary.length;
    const claimCount = summary.flatMap((topic) => topic.claims).length;
    const guidanceDensity = claimCount / groupCount;
    const refDensity = (footnotes.length - unusedFootnotes.length) / groupCount;

    await logger(
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
