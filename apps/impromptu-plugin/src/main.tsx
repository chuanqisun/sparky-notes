import { MessageToFigma } from "@impromptu/types";
import { ArxivSearchProxy, getArxivSearchProxy } from "./arxiv/search";
import { getSearchProxy, SearchProxy } from "./hits/proxy";
import { CompletionProxy, getCompletionProxy } from "./openai/completion";
import { AgentProgram } from "./programs/agent";
import { AnswerProgram } from "./programs/answer";
import { ArxivSearchProgram } from "./programs/arxiv-search";
import { CategorizeProgram } from "./programs/categorize";
import { CompletionProgram } from "./programs/completion";
import { FilterProgram } from "./programs/filter";
import { filterToProgramNode, findMatchedProgram, Program, ProgramContext, PROGRAME_NAME_KEY } from "./programs/program";
import { RelateProgram } from "./programs/relate";
import { ReportProgram } from "./programs/report";
import { ResearchInsightsProgram } from "./programs/research-insights";
import { ResearchRecommendationsProgram } from "./programs/research-recommendations";
import { SortProgram } from "./programs/sort";
import { SummarizeProgram } from "./programs/summarize";
import { ThemeProgram } from "./programs/theme";
import { WebBrowseProgram } from "./programs/web-browse";
import { WebSearchProgram } from "./programs/web-search";
import { emptySections, joinWithConnector, moveToDownstreamPosition, moveToUpstreamPosition } from "./utils/edit";
import { EventLoop } from "./utils/event-loop";
import { ensureStickyFont } from "./utils/font";
import { getExecutionOrder, getNextNodes, getPrevNodes } from "./utils/graph";
import { Logger } from "./utils/logger";
import { clearNotification, replaceNotification } from "./utils/notify";
import { filterToHaveWidgetDataKey, filterToType, getNodePlaintext, getProgramNodeHash, getStickySummary } from "./utils/query";
import { notifyUI } from "./utils/rpc";
import { getAllDataNodes, getSelectedDataNodes, getSelectedProgramNodes, getSelectedStickies } from "./utils/selection";
import { moveToViewportCenter, zoomToFit } from "./utils/viewport";
import { getWebCrawlProxy, WebCrawlProxy } from "./web/crawl";
import { getWebSearchProxy, WebSearchProxy } from "./web/search";

const showUI = (href: string, options?: ShowUIOptions) => figma.showUI(`<script>window.location.href="${href}"</script>`, options);

let fontInitPromise = ensureStickyFont();

let arxivSearch: ArxivSearchProxy;
let completion!: CompletionProxy;
let hitsSearch!: SearchProxy;
let webSearch: WebSearchProxy;
let webCrawl: WebCrawlProxy;

const programs: Program[] = [
  new AgentProgram(),
  new AnswerProgram(),
  new ArxivSearchProgram(),
  new CategorizeProgram(),
  new CompletionProgram(),
  new FilterProgram(),
  new RelateProgram(),
  new ReportProgram(),
  new ResearchInsightsProgram(),
  new ResearchRecommendationsProgram(),
  new SortProgram(),
  new SummarizeProgram(),
  new ThemeProgram(),
  new WebBrowseProgram(),
  new WebSearchProgram(),
];

const logger = new Logger();

const matchProgram = findMatchedProgram.bind(null, programs);

interface EventLoopContext {
  queue: string[];
}

let context: EventLoopContext = {
  queue: [],
};

const handleEventLoopStart = (context: EventLoopContext) => {
  notifyUI({ started: true });
  context.queue = [];
  // clear all hash states
  figma.currentPage.findAll(filterToHaveWidgetDataKey("hash")).forEach((node) => node.setPluginData("hash", ""));
};

const handleEventLoopStop = (message?: string) => {
  if (message) {
    replaceNotification(message);
  } else {
    clearNotification();
  }
  notifyUI({ stopped: true });
};

const handleEventLoopTick = async (context: EventLoopContext, eventLoop: EventLoop) => {
  if (!context.queue.length) {
    // event loop exhausted, re-seed tasks from all program nodes on page
    const allProgramNodes = figma.currentPage.findAll(filterToProgramNode);
    if (!allProgramNodes.length) {
      replaceNotification("Waiting for changes...", {
        timeout: Infinity,
        button: {
          text: "Stop",
          action: () => {
            eventLoop.stop();
            return true;
          },
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      return;
    }
    const executionOrderIds = getExecutionOrder(allProgramNodes, allProgramNodes[0].id);
    // TODO, prefer selected nodes as start node when there is a cycle
    context.queue.push(...executionOrderIds);
  }

  const currentNodeId = context.queue.shift()!;

  await fontInitPromise;

  const currentNode = figma.getNodeById(currentNodeId) as FrameNode | null;
  if (!currentNode) return;

  // check if there is any change on the input
  const latestHash = getProgramNodeHash(currentNode);
  const existingHash = currentNode.getPluginData("hash");
  if (latestHash !== existingHash) {
    const program = matchProgram(currentNode);
    if (!program) {
      eventLoop.stop("Unknown program");
      return;
    }

    const summary = program.getSummary(currentNode);
    replaceNotification(summary, {
      timeout: Infinity,
      button: {
        text: "Stop",
        action: () => {
          eventLoop.stop();
          return true;
        },
      },
    });

    // run matching program
    if (![completion, hitsSearch, webCrawl, webSearch, arxivSearch].every(Boolean)) {
      eventLoop.stop("Event loop complex setup error");
      return;
    }

    // run program only if input has changed
    currentNode.setPluginData("hash", latestHash);
    let changeDetected = false;
    const programContext: ProgramContext = {
      sourceNodes: getPrevNodes(currentNode).filter(filterToType<SectionNode>("SECTION")),
      arxivSearch,
      hitsSearch,
      completion,
      webCrawl,
      webSearch,
      isAborted: () => eventLoop.isAborted(),
      isChanged: () => {
        const latestHash = getProgramNodeHash(currentNode);
        const existingHash = currentNode.getPluginData("hash");
        if (latestHash !== existingHash) {
          changeDetected = true;
          return true;
        }
        return false;
      },
    };

    const targetContainers = getNextNodes(currentNode).filter(filterToType<SectionNode>("SECTION"));
    emptySections(targetContainers);
    await program.run(programContext, currentNode);

    if (changeDetected) {
      // rerun current node if changed
      context.queue.unshift(currentNodeId);
      return;
    }
  } else {
    // prevent event loop blocking
    replaceNotification("Waiting for changes...", {
      timeout: Infinity,
      button: {
        text: "Stop",
        action: () => {
          eventLoop.stop();
          return true;
        },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const currentNodeAfterExecution = figma.getNodeById(currentNodeId) as SceneNode | null;
  if (!currentNodeAfterExecution) return;

  const allProgramNodes = figma.currentPage.findAll(filterToProgramNode);

  const executionOrder = getExecutionOrder(allProgramNodes, currentNodeId);
  const remainingExecutionOrderIds = executionOrder.slice(executionOrder.indexOf(currentNodeId) + 1);

  const remainingProgramNodes = (remainingExecutionOrderIds.map((id) => figma.getNodeById(id)).filter(Boolean) as BaseNode[])
    .filter(filterToProgramNode)
    .map((node) => node!.id);

  context.queue = [...remainingProgramNodes];
};

const handleUIMessage = async (message: MessageToFigma) => {
  if (message.clear) {
    let dataNodes = getSelectedDataNodes();
    if (!dataNodes.length) {
      dataNodes = getAllDataNodes();
    }

    emptySections(dataNodes);
  }

  if (message.createProgram) {
    const program = programs.find((program) => program.name === message.createProgram);
    if (!program) {
      replaceNotification(`Program "${message.createProgram}" does not exist.`, { error: true });
      return;
    }

    const selectedDataNodes = getSelectedDataNodes();
    const selectedProgramNodes = getSelectedProgramNodes(filterToProgramNode);
    const inferredDataNodes = selectedProgramNodes.flatMap(getNextNodes).filter(filterToType<SectionNode>("SECTION"));
    const allNodes = [...selectedDataNodes, ...inferredDataNodes, ...selectedProgramNodes];
    const allDataNodeIds = [...selectedDataNodes, ...inferredDataNodes].map((node) => node.id);
    let selectedOutputNodes: SectionNode[] = [];
    if (allNodes.length) {
      const executionList = getExecutionOrder(allNodes, allNodes[0].id);
      selectedOutputNodes = executionList
        .map((id) => figma.getNodeById(id)!)
        .reverse()
        .filter((node) => allDataNodeIds.includes(node.id)) as SectionNode[];
    }

    const {
      programNode: node,
      sourceNodes,
      targetNodes,
    } = await program.create({
      selectedOutputNodes,
    });
    node.setPluginData(PROGRAME_NAME_KEY, program.name);
    node.setRelaunchData({ open: "Open Controller UI" });
    figma.currentPage.appendChild(node);
    if (selectedOutputNodes.length) {
      moveToDownstreamPosition([node], selectedOutputNodes[0]);
    } else {
      moveToViewportCenter(node);
    }

    moveToUpstreamPosition(sourceNodes, node);
    sourceNodes.forEach((sourceNode) => joinWithConnector(sourceNode, node));

    moveToDownstreamPosition(targetNodes, node);
    targetNodes.forEach((targetNode) => joinWithConnector(node, targetNode));

    const allNewNodes = [node, ...sourceNodes, ...targetNodes];
    zoomToFit(allNewNodes);
    figma.currentPage.selection = allNewNodes;
  }

  if (message.hitsConfig) {
    completion = getCompletionProxy(message.hitsConfig.accessToken, logger);
    hitsSearch = getSearchProxy(message.hitsConfig.accessToken, logger);
    webSearch = getWebSearchProxy(message.hitsConfig.accessToken, logger);
    webCrawl = getWebCrawlProxy(message.hitsConfig.accessToken, logger);
    arxivSearch = getArxivSearchProxy(message.hitsConfig.accessToken, logger);
  }

  if (message.start) {
    eventLoop.start();
  }

  if (message.stop) {
    eventLoop.stop();
  }

  if (message.webStarted) {
    handleSelectionChange();
  }
};

const handleSelectionChange = () => {
  const programNodes = getSelectedProgramNodes(filterToProgramNode);
  const dataNodes = getSelectedDataNodes();
  const stickySummaries = getSelectedStickies().map(getStickySummary);

  notifyUI({
    selectionChanged: {
      programNodeIds: programNodes.map((node) => node.id),
      dataNodeIds: dataNodes.map((node) => node.id),
      plaintextNodes: dataNodes.map((node) => ({
        id: node.id,
        text: getNodePlaintext(node),
      })),
      stickies: stickySummaries,
    },
  });
};

showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}#build`, { height: 600, width: 420 });

figma.ui.on("message", handleUIMessage);

const eventLoop = new EventLoop();
eventLoop.on("tick", async () => {
  try {
    await handleEventLoopTick(context, eventLoop);
  } catch (e) {
    eventLoop.stop();
    console.log(e);
    replaceNotification((e as any)?.message ?? "Unknown error", { error: true });
  }
});
eventLoop.on("start", handleEventLoopStart.bind(null, context));
eventLoop.on("stop", handleEventLoopStop);

figma.on("selectionchange", handleSelectionChange);
handleSelectionChange(); // initial
