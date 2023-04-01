import type { WebProxy } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@symphony/types";
import { ActionNode, ObservationNode, ThoughtNode } from "../components/program-node";
import { ChangeTracker } from "../utils/change-tracker";
import { frameNodeToDisplayProgram, selectionNodesToLivePrograms } from "../utils/display-program";
import { $, FigmaQuery } from "../utils/fq";
import { getLinearUpstreamGraph } from "../utils/graph";
import { replaceNotification } from "../utils/notify";

// selection handler
const selectedProgramChangeTracker = new ChangeTracker();

export const onSelectionChange = (context: HandlerContext, selection: readonly SceneNode[]) => {
  const selectedPrograms = selectionNodesToLivePrograms(selection);
  if (selectedProgramChangeTracker.next(selectedPrograms.map((p) => p.id).join(","))) {
    const upstreamGraph = getLinearUpstreamGraph(selectedPrograms.map((p) => p.id));
    if (upstreamGraph.hasCycle) replaceNotification("Remove the cycle to continue", { error: true });

    context.webProxy.notify({
      upstreamGraphChanged: upstreamGraph.nodes.map((node) => ({
        ...frameNodeToDisplayProgram(node),
        isSelected: selectedPrograms.some((p) => p.id === node.id),
      })),
    });
  }
};

// message handlers

export type Handler = (context: HandlerContext, message: MessageToFigma) => any;

export interface HandlerContext {
  webProxy: WebProxy<MessageToWeb, MessageToFigma>;
}

export const onShowNotification: Handler = (_context, message) => {
  if (!message.showNotification) return;
  replaceNotification(message.showNotification.message, message.showNotification.config);
};

export const onWebClientStarted: Handler = (context, message) => {
  if (!message.webClientStarted) return;
  onSelectionChange(context, figma.currentPage.selection);
};

export const respondCreateProgram: Handler = async (context, message) => {
  if (!message.requestCreateProgram) {
    return;
  }

  const messageData = message.requestCreateProgram;
  let fqNode: FigmaQuery;

  switch (messageData.subtype) {
    case "Thought": {
      fqNode = $([await figma.createNodeFromJSXAsync(<ThoughtNode input={messageData.input} />)]);
      fqNode.setPluginData({ type: "programNode", subtype: "Thought", context: "[]" });
      break;
    }
    case "Action": {
      fqNode = $([await figma.createNodeFromJSXAsync(<ActionNode input={messageData.input} />)]);
      fqNode.setPluginData({ type: "programNode", subtype: "Action", context: "[]" });
      break;
    }
    case "Observation": {
      fqNode = $([await figma.createNodeFromJSXAsync(<ObservationNode input={messageData.input} />)]);
      fqNode.setPluginData({ type: "programNode", subtype: "Observation", context: "[]" });
      break;
    }
    default:
      replaceNotification(`Invalid subtype "${message.requestCreateProgram}"`, { error: true });
      return;
  }

  if (fqNode) {
    fqNode.appendTo(figma.currentPage);
    fqNode.setPluginData({
      context: JSON.stringify([
        {
          id: fqNode.toNodes()[0].id,
          direction: "Start",
          subtype: messageData.subtype,
          input: messageData.input,
        },
      ]),
    });

    const parentNodes = messageData.parentIds.map((id) => figma.getNodeById(id) as FrameNode);
    if (parentNodes.length) {
      fqNode.moveToGraphTargetPosition(parentNodes).scrollOrZoomOutViewToContain().connectFromNodes(parentNodes);
    } else {
      fqNode.moveToViewCenter().zoomOutViewToContain();
    }
    context.webProxy.respond(message, { respondCreateProgram: frameNodeToDisplayProgram(fqNode.toNodes()[0] as FrameNode) });
  }
};

export const respondCreateSpatialProgram: Handler = async (context, message) => {
  if (!message.requestCreateSpatialProgram) {
    return;
  }

  const messageData = message.requestCreateSpatialProgram;
  let fqNode: FigmaQuery;

  switch (messageData.subtype) {
    case "Thought": {
      fqNode = $([await figma.createNodeFromJSXAsync(<ThoughtNode input={messageData.input} />)]);
      fqNode.setPluginData({ type: "programNode", subtype: "Thought" });
      break;
    }
    case "Action": {
      fqNode = $([await figma.createNodeFromJSXAsync(<ActionNode input={messageData.input} />)]);
      fqNode.setPluginData({ type: "programNode", subtype: "Action" });
      break;
    }
    case "Observation": {
      fqNode = $([await figma.createNodeFromJSXAsync(<ObservationNode input={messageData.input} />)]);
      fqNode.setPluginData({ type: "programNode", subtype: "Observation" });
      break;
    }
    default:
      replaceNotification(`Invalid subtype "${message.requestCreateProgram}"`, { error: true });
      return;
  }

  if (fqNode) {
    fqNode.appendTo(figma.currentPage);
    const anchorNode = messageData.anchorId ? (figma.getNodeById(messageData.anchorId) as SceneNode) : null;
    if (anchorNode) {
      fqNode.setPluginData({
        context: [
          JSON.stringify([
            ...JSON.parse(anchorNode.getPluginData("context") ?? "[]"),
            {
              id: fqNode.toNodes()[0].id,
              direction: messageData.directionFromAnchor ?? "Down",
              subtype: messageData.subtype,
              input: messageData.input,
              // subtype: anchorNode.getPluginData("subtype"),
              // input:
              //   getFieldByLabel("Thought", anchorNode as FrameNode)?.value.characters ??
              //   getFieldByLabel("Action", anchorNode as FrameNode)?.value.characters ??
              //   getFieldByLabel("Observation", anchorNode as FrameNode)?.value.characters,
            },
          ]),
        ].join("\n"),
      });
      fqNode.moveToDirection(messageData.directionFromAnchor ?? "Down", [anchorNode]).scrollOrZoomOutViewToContain();
    } else {
      fqNode.moveToViewCenter().zoomOutViewToContain();
    }
    context.webProxy.respond(message, { respondCreateProgram: frameNodeToDisplayProgram(fqNode.toNodes()[0] as FrameNode) });
  }
};

export const respondLinearContextGraph: Handler = async (context, message) => {
  if (!message.requestUpstreamGraph) return;

  const graph = getLinearUpstreamGraph(message.requestUpstreamGraph.leafIds);
  if (graph.hasCycle) {
    replaceNotification("Cycle detected in graph", { error: true });
    return;
  }
  if (!graph.nodes.length) {
    replaceNotification("Selection not found", { error: true });
    return;
  }

  context.webProxy.respond(message, { respondUpstreamGraph: graph.nodes.map(frameNodeToDisplayProgram) });
};
