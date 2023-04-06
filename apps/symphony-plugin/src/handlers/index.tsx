import type { WebProxy } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@symphony/types";
import { ActionNode, ObservationNode, ThoughtNode } from "../components/program-node";
import { getFieldByLabel } from "../components/text-field";
import { ChangeTracker } from "../utils/change-tracker";
import { frameNodeToDisplayProgram, selectionNodesToLivePrograms } from "../utils/display-program";
import { $, FigmaQuery } from "../utils/fq";
import { getLinearUpstreamGraph } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToHaveWidgetDataKey, getAbsoluteBoundingBox, sortByDistance } from "../utils/query";

// selection handler
const selectedProgramChangeTracker = new ChangeTracker();

export const onSelectionChange = (context: HandlerContext, selection: readonly SceneNode[]) => {
  const selectedPrograms = selectionNodesToLivePrograms(selection);

  if (selectedProgramChangeTracker.next(selectedPrograms.flatMap((p) => [p.id, p.input]).join(","))) {
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
      fqNode.setPluginData({ type: "programNode", subtype: "Thought", context: "[]", dirFromAnchor: "Start" });
      break;
    }
    case "Action": {
      fqNode = $([await figma.createNodeFromJSXAsync(<ActionNode input={messageData.input} />)]);
      fqNode.setPluginData({ type: "programNode", subtype: "Action", context: "[]", dirFromAnchor: "Start" });
      break;
    }
    case "Observation": {
      fqNode = $([await figma.createNodeFromJSXAsync(<ObservationNode input={messageData.input} />)]);
      fqNode.setPluginData({ type: "programNode", subtype: "Observation", context: "[]", dirFromAnchor: "Start" });
      break;
    }
    default:
      replaceNotification(`Invalid subtype "${message.requestCreateProgram}"`, { error: true });
      return;
  }

  if (fqNode) {
    fqNode.appendTo(figma.currentPage);

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
        dirFromAnchor: messageData.directionFromAnchor ?? "Down",
        context: [
          JSON.stringify([
            ...JSON.parse(anchorNode.getPluginData("context") ?? "[]"),
            {
              id: anchorNode.id,
              direction: anchorNode.getPluginData("dirFromAnchor") ?? "Start",
              subtype: anchorNode.getPluginData("subtype"),
              input: getFieldByLabel(anchorNode.getPluginData("subtype"), anchorNode as FrameNode)!.value.characters,
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

export const respondAmbientPrograms: Handler = async (context, message) => {
  if (!message.requestAmbientPrograms) return;

  const selectedNodes = message.requestAmbientPrograms.anchorIds.map((id) => figma.getNodeById(id)).filter(Boolean) as FrameNode[];

  const viewportNodes = $(figma.currentPage.findAll(filterToHaveWidgetDataKey("type")))
    .viewportIntersections()
    .toNodes()
    .filter((node) => selectedNodes.every((selectedNode) => selectedNode.id !== node.id));

  const measuringCenter = selectedNodes.length ? getAbsoluteBoundingBox(selectedNodes) : figma.viewport.center;

  const sorted = sortByDistance(viewportNodes as FrameNode[], measuringCenter).map(frameNodeToDisplayProgram);
  context.webProxy.respond(message, { respondAmbientPrograms: sorted });
};
