import { MessageToFigma } from "@impromptu/types";
import { ArxivSearchProxy, getArxivSearchProxy } from "./arxiv/search";
import { SearchProxy, getSearchProxy } from "./hits/proxy";
import { getSynthesis } from "./hits/synthesis";
import { importTextFile } from "./import/import";
import { ChatProxy, getChatResponse, modelToEndpoint } from "./openai/chat";
import { CompletionProxy, getCompletionProxy } from "./openai/completion";
import { AgentProgram } from "./programs/agent";
import { AgentV2Program } from "./programs/agent-v2";
import { AnswerProgram } from "./programs/answer";
import { ArxivSearchProgram } from "./programs/arxiv-search";
import { CategorizeProgram } from "./programs/categorize";
import { ChatProgram } from "./programs/chat";
import { CollectProgram } from "./programs/collect";
import { FilterProgram } from "./programs/filter";
import { JoinProgram } from "./programs/join";
import { PROGRAME_NAME_KEY, Program, ProgramContext, ReflectionContext, filterToProgramNode, findMatchedProgram } from "./programs/program";
import { RelateProgram } from "./programs/relate";
import { ResearchInsightsProgram } from "./programs/research-insights";
import { ResearchRecommendationsProgram } from "./programs/research-recommendations";
import { SortProgram } from "./programs/sort";
import { SummarizeProgram } from "./programs/summarize";
import { TemplateProgram } from "./programs/template";
import { ThemeProgram } from "./programs/theme";
import { WebBrowseProgram } from "./programs/web-browse";
import { WebSearchProgram } from "./programs/web-search";
import { createTargetNodes, emptySections, joinWithConnector, moveStickiesToSection, moveToDownstreamPosition, moveToUpstreamPosition } from "./utils/edit";
import { AdhocEventLoop, EventLoop } from "./utils/event-loop";
import { ensureStickyFont } from "./utils/font";
import { getExecutionOrder, getNextNodes, getPrevNodes } from "./utils/graph";
import { Logger } from "./utils/logger";
import { clearNotification, replaceNotification } from "./utils/notify";
import { filterToHaveWidgetDataKey, filterToType, getProgramNodeHash, getStickySummary } from "./utils/query";
import { notifyUI, respondUI } from "./utils/rpc";
import {
  getAllDataNodes,
  getPrimaryDataNode,
  getRunnableProgramNodeIds,
  getSelectedDataNodes,
  getSelectedProgramNodes,
  getSelectedStickies,
} from "./utils/selection";
import { moveToViewportCenter, zoomToFit } from "./utils/viewport";
import { WebCrawlProxy, getWebCrawlProxy } from "./web/crawl";
import { WebSearchProxy, getWebSearchProxy } from "./web/search";

console.log(`Impromptu timestamp`, process.env.VITE_TIMESTAMP);

const showUI = (href: string, options?: ShowUIOptions) => figma.showUI(`<script>window.location.href="${href}"</script>`, options);

let fontInitPromise = ensureStickyFont();

let arxivSearch: ArxivSearchProxy;
let completion!: CompletionProxy;
let chat!: ChatProxy;
let hitsSearch!: SearchProxy;
let webSearch: WebSearchProxy;
let webCrawl: WebCrawlProxy;

const programs: Program[] = [
  new AgentProgram(),
  new AgentV2Program(),
  new AnswerProgram(),
  new ArxivSearchProgram(),
  new CategorizeProgram(),
  new CollectProgram(),
  new ChatProgram(),
  new FilterProgram(),
  new JoinProgram(),
  new RelateProgram(),
  new ResearchInsightsProgram(),
  new ResearchRecommendationsProgram(),
  new SortProgram(),
  new SummarizeProgram(),
  new TemplateProgram(),
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
      chat,
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

  if (message.importTextFile) {
    const lineCount = message.importTextFile.text.split("\n").length;
    replaceNotification(`Converting... (about ${Math.ceil(lineCount / 1.4)} seconds)`, { timeout: Infinity });
    console.log("Importing", message.importTextFile);
    importTextFile(chat, message.importTextFile)
      .then((results) => {
        const container = createTargetNodes(["Imported"])[0];
        for (const result of results) {
          const sticky = figma.createSticky();
          sticky.text.characters = result;
          moveStickiesToSection([sticky], container);
        }

        replaceNotification("✅ Successfully imported");
      })
      .catch((e) => replaceNotification(`Import failed: ${(e as any).name} ${(e as any).message}`));
  }

  if (message.hitsConfig) {
    arxivSearch = getArxivSearchProxy(message.hitsConfig.accessToken, logger);
    chat = (messages, config) => getChatResponse(message.hitsConfig!.accessToken, modelToEndpoint(config.model), messages, config, logger);
    completion = getCompletionProxy(message.hitsConfig.accessToken, logger);
    hitsSearch = getSearchProxy(message.hitsConfig.accessToken, logger);
    webCrawl = getWebCrawlProxy(message.hitsConfig.accessToken, logger);
    webSearch = getWebSearchProxy(message.hitsConfig.accessToken, logger);
  }

  if (message.requestDataNodeSynthesis) {
    const reflectionContext: ReflectionContext = { completion };
    const synthesis = await getSynthesis(reflectionContext, matchProgram, message.requestDataNodeSynthesis.dataNodeId).catch((e) => {
      replaceNotification(`Synthesis failed: ${e.name} ${e.message}`, { error: true });
      respondUI(message, { respondDataNodeSynthesis: { error: `${e.name} ${e.message}` } });
      return null;
    });
    if (!synthesis) return;

    respondUI(message, { respondDataNodeSynthesis: synthesis });
  }

  if (message.runSelected) {
    autoEventLoop.stop();
    if (!message.runSelected.runnableProgramNodeIds.length) {
      replaceNotification("Select any program or output section to run");
      return;
    }

    const sourceNodes = message.runSelected.runnableProgramNodeIds.map((id) => figma.getNodeById(id)).filter(Boolean) as FrameNode[];
    if (!sourceNodes.length) {
      replaceNotification("Selected nodes do not exist", { error: true });
      return;
    }

    const order = getExecutionOrder(sourceNodes, sourceNodes[0].id);
    const sortedRunnableProgramNodes = sourceNodes.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

    // emulate event loop
    adhocEventLoop.start();
    notifyUI({ started: true });

    await fontInitPromise;

    console.log(`adhoc run ${sortedRunnableProgramNodes.length} programs`);

    for (const currentNode of sortedRunnableProgramNodes) {
      const programContext: ProgramContext = {
        sourceNodes: getPrevNodes(currentNode).filter(filterToType<SectionNode>("SECTION")),
        arxivSearch,
        hitsSearch,
        chat,
        completion,
        webCrawl,
        webSearch,
        isAborted: () => adhocEventLoop.isAborted(),
        isChanged: () => false,
      };

      const targetContainers = getNextNodes(currentNode).filter(filterToType<SectionNode>("SECTION"));
      emptySections(targetContainers);
      const program = matchProgram(currentNode);
      if (!program) {
        replaceNotification("Unknown program");
        return;
      }

      const summary = program.getSummary(currentNode);
      replaceNotification(summary, {
        timeout: Infinity,
        button: {
          text: "Stop",
          action: () => {
            adhocEventLoop.stop();
            return true;
          },
        },
      });
      await program.run(programContext, currentNode);

      if (adhocEventLoop.isAborted()) {
        return;
      }
    }

    adhocEventLoop.stop();
    replaceNotification("Done");
    notifyUI({ stopped: true });
  }

  if (message.showNotification) {
    replaceNotification(message.showNotification.message, message.showNotification.config);
  }

  if (message.start) {
    autoEventLoop.start();
  }

  if (message.stop) {
    adhocEventLoop.stop();
    autoEventLoop.stop();
  }

  if (message.webStarted) {
    handleSelectionChange();
  }
};

const handleSelectionChange = () => {
  const programNodes = getSelectedProgramNodes(filterToProgramNode);
  const dataNodes = getSelectedDataNodes();
  const stickySummaries = getSelectedStickies().map(getStickySummary);
  const primaryDataNode = dataNodes.length ? getPrimaryDataNode(dataNodes[0]) : null;
  const runnableProgramNodeIds = getRunnableProgramNodeIds(programNodes, dataNodes);

  notifyUI({
    selectionChanged: {
      programNodeIds: programNodes.map((node) => node.id),
      dataNodeIds: dataNodes.map((node) => node.id),
      primaryDataNode,
      runnableProgramNodeIds,
      stickies: stickySummaries,
    },
  });
};

showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 620, width: 420 });

figma.ui.on("message", handleUIMessage);

const adhocEventLoop = new AdhocEventLoop();
const autoEventLoop = new EventLoop();
autoEventLoop.on("tick", async () => {
  try {
    await handleEventLoopTick(context, autoEventLoop);
  } catch (e) {
    autoEventLoop.stop();
    console.log(e);
    replaceNotification((e as any)?.message ?? "Unknown error", { error: true });
  }
});
autoEventLoop.on("start", handleEventLoopStart.bind(null, context));
autoEventLoop.on("stop", handleEventLoopStop);

figma.on("selectionchange", handleSelectionChange);
handleSelectionChange(); // initial
