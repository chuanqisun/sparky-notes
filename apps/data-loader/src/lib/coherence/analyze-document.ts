import { assert } from "console";
import { appendFile, mkdir, readFile, readdir, writeFile } from "fs/promises";
import { getLengthSensitiveChatProxy, getLoadBalancedChatProxyV2, getSimpleChatProxy } from "../azure/chat";
import { getClaimIndexProxy } from "../hits/search-claims";
import { extractMarkdownTitle } from "./pipeline/extract-markdown-title";
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
import { renderMarkdown } from "./pipeline/render-markdown";
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
    // TODO persona based semantic search query expansion
    // TODO list unused footnotes under the "other" group
    // TODO handle untitled section in source document

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
    const resumeQuestionToConcept = true;
    const resumeInferGoals = true;
    const resumeInferProblems = true;
    const resumeInferSupporters = true;
    const resumeInferProtesters = true;
    const resumeSemanticSearch = true;
    const resumeCurationReponse = false; // (!)

    const proxies = {
      concept: lengthSensitiveProxy,
      guidance: lengthSensitiveProxy,
      questions: lengthSensitiveProxy,
      questionToConcept: chatProxy, // short
      goals: chatProxy, // short
      problems: chatProxy, // short
      supporters: chatProxy, // short
      protesters: chatProxy, // short
      curation: lengthSensitiveProxyGpt4,
    };

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
      resumeOrRun(resumeGetConcept, progressObject.concept, () => getConcept(proxies.concept, markdownFile)),
      resumeOrRun(resumeGetGuidance, progressObject.guidance, () => getGuidance(proxies.guidance, markdownFile)),
      resumeOrRun(resumeGetQuestions, progressObject.questions, () => getQuestions(proxies.questions, markdownFile, 20)),
    ]);

    await incrementalLogObject({ pattern, concept, guidance, questions });

    const [questionedConcepts, goals, problems, supporters, protesters] = await Promise.all([
      resumeOrRun(resumeQuestionToConcept, progressObject.questionedConcepts, () => questionToConcepts(proxies.questionToConcept, questions)),
      resumeOrRun(resumeInferGoals, progressObject.goals, () => inferUserGoals(proxies.goals, concept.name, concept.definition, concept.alternativeNames)),
      resumeOrRun(resumeInferProblems, progressObject.problems, () =>
        inferUserProblems(proxies.problems, concept.name, concept.definition, concept.alternativeNames)
      ),
      resumeOrRun(resumeInferSupporters, progressObject.supporters, () =>
        inferSupporters(proxies.supporters, concept.name, concept.definition, concept.alternativeNames)
      ),
      resumeOrRun(resumeInferProtesters, progressObject.protesters, () =>
        inferProtesters(proxies.protesters, concept.name, concept.definition, concept.alternativeNames)
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
      curateClaimsV2(proxies.curation, concept, aggregated)
    );
    await logger("curate", `curation ${curationResponse.length} chars`);
    incrementalLogObject({ curationResponse });

    const parsedCuration = parseCuration(aggregated, curationResponse);
    const footnoteUtilizationRate = parsedCuration.usedFootNotePositions.length / parsedCuration.footnotes.length;
    const citationsPerItem =
      parsedCuration.groups.reduce((a, b) => a + b.items.reduce((x, y) => x + y.sources.length, 0), 0) /
      parsedCuration.groups.reduce((a, b) => a + b.items.length, 0);
    await logger(
      "curate",
      `groups: ${parsedCuration.groups.length}, footnotes: ${parsedCuration.footnotes.length}, source utilization: ${footnoteUtilizationRate}, citation per item: ${citationsPerItem}, invalid: ${parsedCuration.unknownFootNotePositions.length}}`
    );
    incrementalLogObject({ parsedCuration });

    const markdown = renderMarkdown(pattern, parsedCuration);
    await mkdir(`${outDir}/result`, { recursive: true });
    await writeFile(`${outDir}/result/${filename}.json`, JSON.stringify(parsedCuration, null, 2));
    await writeFile(`${outDir}/result/${filename}.md`, markdown);
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
