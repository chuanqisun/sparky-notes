import { ChatManager, ChatWorker, getOpenAIWorkerProxy, type ChatInput } from "@h20/plex-chat";
import { getTimeoutFunction } from "@h20/plex-chat/src/controller/timeout";
import { LogLevel } from "@h20/plex-chat/src/scheduler/logger";
import { assert } from "console";
import { appendFile, mkdir, readFile, readdir, writeFile } from "fs/promises";
import gptTokenzier from "gpt-tokenizer";
import { type SimpleChatInput } from "../azure/chat";
import { getClaimIndexProxy } from "../hits/search-claims";
import { extractMarkdownTitle } from "./pipeline/extract-markdown-title";
import {
  curateClaimsV3,
  getConcept,
  getGuidance,
  getInterpretationStats,
  getQuestions,
  inferProtesters,
  inferSupporters,
  inferUserGoals,
  inferUserProblems,
  interpretFindings,
  questionToConcepts,
} from "./pipeline/inference";
import { parseCuration } from "./pipeline/parse-curation";
import { getAssumption, getImpliedQuestion } from "./pipeline/reflect";
import { renderMarkdown } from "./pipeline/render-markdown";
import { bulkSemanticQuery, groupById, type DecoratedQuery } from "./pipeline/semantic-search";

export async function analyzeDocument(dir: string, outDir: string) {
  const endpoints = [
    {
      apiKey: process.env.OPENAI_API_KEY!,
      endpoint: process.env.OPENAI_CHAT_ENDPOINT!,
      model: "gpt-35-turbo",
      contextWindow: 8_192,
      rpm: 720,
      tpm: 120_000,
      timeout: getTimeoutFunction(3_000, 25),
    },
    {
      apiKey: process.env.OPENAI_DEV_API_KEY!,
      endpoint: process.env.OPENAI_CHAT_ENDPOINT_V35!,
      model: "gpt-35-turbo",
      contextWindow: 8_192,
      rpm: 720,
      tpm: 120_000,
      timeout: getTimeoutFunction(3_000, 25),
    },
    {
      apiKey: process.env.OPENAI_DEV_API_KEY!,
      endpoint: process.env.OPENAI_CHAT_ENDPOINT_V35_16K!,
      model: "gpt-35-turbo-16k",
      contextWindow: 16_384,
      rpm: 522,
      tpm: 87_000,
      timeout: getTimeoutFunction(3_000, 25),
    },
    {
      apiKey: process.env.OPENAI_DEV_API_KEY!,
      endpoint: process.env.OPENAI_CHAT_ENDPOINT_V4_8K!,
      model: "gpt-4",
      contextWindow: 8_192,
      rpm: 60,
      tpm: 10_000,
      timeout: getTimeoutFunction(5_000, 30),
    },
    {
      apiKey: process.env.OPENAI_DEV_API_KEY!,
      endpoint: process.env.OPENAI_CHAT_ENDPOINT_V4_32K!,
      model: "gpt-4-32k",
      contextWindow: 32_768,
      rpm: 180,
      tpm: 30_000,
      timeout: getTimeoutFunction(5_000, 30),
    },
  ];
  assert(
    endpoints.every((e) => e.apiKey),
    "Some api key is missing"
  );
  assert(
    endpoints.every((e) => e.endpoint),
    "Some endpoint is missing"
  );

  assert(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required");
  assert(process.env.HITS_UAT_SEARCH_API_KEY, "HITS_UAT_SEARCH_API_KEY is required");

  mkdir(outDir, { recursive: true });

  const workers: ChatWorker[] = endpoints.map(
    (endpoint) =>
      new ChatWorker({
        proxy: getOpenAIWorkerProxy({
          apiKey: endpoint.apiKey,
          endpoint: endpoint.endpoint,
        }),
        requestsPerMinute: endpoint.rpm,
        timeout: endpoint.timeout,
        contextWindow: endpoint.contextWindow,
        models: [endpoint.model],
        concurrency: 10,
        tokensPerMinute: endpoint.tpm,
        logLevel: LogLevel.Info,
      })
  );

  const manager = new ChatManager({ workers, logLevel: LogLevel.Info });

  const defaultChatInput: ChatInput = {
    messages: [],
    temperature: 0,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 60,
    stop: "",
  };

  const gpt4Proxy = (input: SimpleChatInput) =>
    manager.submit({
      tokenDemand: gptTokenzier.encodeChat(input.messages, "gpt-4").length * 1.05 + (input.max_tokens ?? defaultChatInput.max_tokens),
      models: ["gpt-4", "gpt-4-32k"],
      input: {
        ...defaultChatInput,
        ...input,
      },
    });

  const gpt35Proxy = (input: SimpleChatInput) =>
    manager.submit({
      tokenDemand: gptTokenzier.encodeChat(input.messages, "gpt-3.5-turbo").length * 1.05 + (input.max_tokens ?? defaultChatInput.max_tokens),
      models: ["gpt-35-turbo", "gpt-35-turbo-16k"],
      input: {
        ...defaultChatInput,
        ...input,
      },
    });

  const claimSearchProxy = getClaimIndexProxy(process.env.HITS_UAT_SEARCH_API_KEY!);

  const startTime = Date.now();
  const filenames = await readdir(dir);
  const allFileLazyTasks = filenames.map((filename, i) => async () => {
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
      interpretations: any;
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
    const resumeInterpretSearchResult = true;
    const resumeCurationReponse = true;

    const proxies = {
      concept: gpt35Proxy,
      guidance: gpt35Proxy,
      questions: gpt35Proxy,
      questionToConcept: gpt35Proxy,
      goals: gpt35Proxy,
      problems: gpt35Proxy,
      supporters: gpt35Proxy,
      protesters: gpt35Proxy,
      interpretation: gpt35Proxy,
      curation: gpt4Proxy,
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
    await logger(
      "search",
      `semantic search ${positiveQ.length} positive queries, ${negativeQ.length} negative queries, precision ${positiveQ.length / rankedResults.length}`
    );
    incrementalLogObject({ rankedResults });

    const aggregated = rankedResults
      .flatMap((item) =>
        item.responses.map((res) => ({
          ...res,
          queries: [
            {
              raw: item.query,
              impliedQuestion: getImpliedQuestion(progressObject, concept.name, item.query),
              assumption: getAssumption(progressObject, concept.name, item.query),
            } satisfies DecoratedQuery,
          ],
        }))
      )
      .reduce(groupById, [])
      .sort((a, b) => b.score - a.score)
      .slice(0, 40); // prevent overflow

    // analyze aggregation quality with top, avg, bottom scores
    const allScores = aggregated.map((item) => item.score);
    const topScore = Math.max(...allScores);
    const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const bottomScore = Math.min(...allScores);
    await logger("search", `aggregation ${aggregated.length} items. Score top ${topScore}, avg ${avgScore}, bottom ${bottomScore}`);
    incrementalLogObject({ aggregated });

    const interpretations = await resumeOrRun(resumeInterpretSearchResult, progressObject.interpretations, () =>
      interpretFindings(
        proxies.interpretation,
        (input, output) => {
          console.log({ finding: input.caption, interpretation: output.interpretation, category: output.category });
        },
        concept,
        aggregated
      )
    );

    await logger(
      "interpret",
      `${getInterpretationStats(interpretations)
        .map((statItem) => `${statItem.count} ${statItem.category}`)
        .join(", ")}`
    );
    incrementalLogObject({ interpretations });

    const relevantInterpretations = interpretations.filter((item) => item.category !== "irrelevant");
    const curationResponse = await resumeOrRun(resumeCurationReponse, progressObject.curationResponse, () =>
      curateClaimsV3(proxies.curation, concept, relevantInterpretations)
    );
    await logger("curate", `curation ${curationResponse.length} chars`);
    incrementalLogObject({ curationResponse });

    const parsedCuration = parseCuration(relevantInterpretations, curationResponse);

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
  // await allFileLazyTasks.reduce(reducePromisesSerial, Promise.resolve());
  // parallel execution
  await Promise.all(allFileLazyTasks.map((lazyTask) => lazyTask()));
}

function reducePromisesSerial(acc: Promise<any>, item: () => Promise<any>) {
  return acc.then(item);
}
