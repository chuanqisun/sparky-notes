import { MessageToFigma } from "@impromptu/types";
import { getSearchProxy, SearchProxy } from "./hits/proxy";
import { CompletionProxy, getCompletionProxy } from "./openai/completion";
import { CategorizeProgram } from "./programs/categorize";
import { FilterProgram } from "./programs/filter";
import { filterToProgramNode, findMatchedProgram, ProgramContext, PROGRAME_NAME_KEY } from "./programs/program";
import { PromptProgram } from "./programs/prompt";
import { ResearchInsightsProgram } from "./programs/research-insights";
import { ResearchRecommendationsProgram } from "./programs/research-recommendations";
import { joinWithConnector, moveToDownstreamPosition, moveToUpstreamPosition, resizeToHugContent } from "./utils/edit";
import { EventLoop } from "./utils/event-loop";
import { getExecutionOrder, getNextNodes, getPrevNodes } from "./utils/graph";
import { getProgramNodeHash } from "./utils/hash";
import { clearNotification, replaceNotification } from "./utils/notify";
import { filterToHaveWidgetDataKey, filterToType } from "./utils/query";
import { notifyUI } from "./utils/rpc";
import { getSelectedDataNodes, getSelectedProgramNodes } from "./utils/selection";
import { moveToViewportCenter, zoomToFit } from "./utils/viewport";

const showUI = (href: string, options?: ShowUIOptions) => figma.showUI(`<script>window.location.href="${href}"</script>`, options);

let completion: CompletionProxy | null = null;
let hitsSearch: SearchProxy | null = null;

const programs = [new PromptProgram(), new CategorizeProgram(), new FilterProgram(), new ResearchInsightsProgram(), new ResearchRecommendationsProgram()];
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

  const currentNode = figma.getNodeById(currentNodeId) as FrameNode | null;
  if (!currentNode) return;

  // check if there is any change on the input
  const sourceNodes = getPrevNodes(currentNode).filter(filterToType<SectionNode>("SECTION"));
  const targetNodes = getNextNodes(currentNode).filter(filterToType<SectionNode>("SECTION"));
  const latestHash = getProgramNodeHash(currentNode, sourceNodes, targetNodes);
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
    if (!completion) {
      eventLoop.stop("Open AI Completion is not setup yet.");
      return;
    }
    if (!hitsSearch) {
      // TODO report token validity
      eventLoop.stop("HITS Search is not setup yet.");
      return;
    }

    // run program only if input has changed
    currentNode.setPluginData("hash", latestHash);
    const programContext: ProgramContext = {
      sourceNodes: getPrevNodes(currentNode).filter(filterToType<SectionNode>("SECTION")),
      hitsSearch,
      completion,
      isAborted: () => eventLoop.isAborted(),
    };
    await program.run(programContext, currentNode);
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
    const dataNodes = getSelectedDataNodes();
    dataNodes.forEach((node) => {
      node.children.forEach((child) => child.remove());
      resizeToHugContent(node);
    });
  }

  if (message.createProgram) {
    const program = programs.find((program) => program.name === message.createProgram);
    if (!program) {
      replaceNotification(`Program "${message.createProgram}" does not exist.`, { error: true });
      return;
    }
    const { programNode: node, sourceNodes, targetNodes } = await program.create();
    node.setPluginData(PROGRAME_NAME_KEY, program.name);
    figma.currentPage.appendChild(node);
    moveToViewportCenter(node);

    moveToUpstreamPosition(sourceNodes, node);
    sourceNodes.forEach((sourceNode) => joinWithConnector(sourceNode, node));

    moveToDownstreamPosition(targetNodes, node);
    targetNodes.forEach((targetNode) => joinWithConnector(node, targetNode));

    const allNewNodes = [node, ...sourceNodes, ...targetNodes];
    zoomToFit(allNewNodes);
    figma.currentPage.selection = allNewNodes;
  }

  if (message.hitsConfig) {
    completion = getCompletionProxy(message.hitsConfig.accessToken);
    hitsSearch = getSearchProxy(message.hitsConfig.accessToken);
  }

  if (message.start) {
    eventLoop.start();
  }

  if (message.stop) {
    eventLoop.stop();
  }
};

const handleSelectionChange = () => {
  const programNodes = getSelectedProgramNodes(filterToProgramNode);
  const dataNodes = getSelectedDataNodes();

  programNodes.map(matchProgram).forEach((program, index) => program?.onEdit?.(programNodes[index]));

  notifyUI({
    selectionChangedV2: {
      programNodeIds: programNodes.map((node) => node.id),
      dataNodeIds: dataNodes.map((node) => node.id),
    },
  });
};

showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}#build`, { height: 600, width: 420 });

figma.ui.on("message", handleUIMessage);

const eventLoop = new EventLoop();
eventLoop.on("tick", handleEventLoopTick.bind(null, context, eventLoop));
eventLoop.on("start", handleEventLoopStart.bind(null, context));
eventLoop.on("stop", handleEventLoopStop);

figma.on("selectionchange", handleSelectionChange);
handleSelectionChange(); // initial
