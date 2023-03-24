import type { WebProxy } from "@h20/figma-relay";
import type { DisplayProgram, MessageToFigma, MessageToWeb } from "@symphony/types";
import { QuestionNode, ThoughtNode } from "../components/program-node";
import { frameNodeToDisplayProgram, selectionNodesToDisplayPrograms } from "../utils/display-program";
import { $, FigmaQuery } from "../utils/fq";
import { getOutConnectors, selectInConnectors, traverse } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { sortUpstreamNodes } from "../utils/sort";

export type Handler = (message: MessageToFigma, context: HandlerContext) => any;

export interface HandlerContext {
  webProxy: WebProxy<MessageToWeb, MessageToFigma>;
}

export const onShowNotification: Handler = (message, _context) => {
  if (!message.showNotification) return;
  replaceNotification(message.showNotification.message, message.showNotification.config);
};

export const onWebClientStarted: Handler = (message, context) => {
  if (!message.webClientStarted) return;
  context.webProxy.notify({ programSelectionChanged: selectionNodesToDisplayPrograms(figma.currentPage.selection) });
};

export const respondCreateProgram: Handler = async (message, context) => {
  if (!message.requestCreateProgram) {
    return;
  }

  const messageData = message.requestCreateProgram;
  let fqNode: FigmaQuery;

  switch (messageData.subtype) {
    case "Thought": {
      fqNode = $([await figma.createNodeFromJSXAsync(<ThoughtNode input={messageData.input} />)]);
      fqNode.setPluginData({ type: "programNode", subtype: "Thought" });
      break;
    }
    case "Question": {
      fqNode = $([await figma.createNodeFromJSXAsync(<QuestionNode input={messageData.input} />)]);
      fqNode.setPluginData({ type: "programNode", subtype: "Question" });
      break;
    }
    default:
      replaceNotification(`Invalid subtype "${message.requestCreateProgram}"`, { error: true });
      return;
  }

  if (fqNode) {
    const parentNode = messageData.parentIds.length ? (figma.getNodeById(messageData.parentIds[0]) as FrameNode) : null;
    fqNode.appendTo(figma.currentPage);
    if (parentNode) {
      fqNode.moveToGraphNextPosition(parentNode).select().scrollOrZoomOutViewToContain();
      $([parentNode, ...fqNode.toNodes()]).joinWithConnectors("down");
    } else {
      fqNode.select().moveToViewCenter().zoomOutViewToContain();
    }
    context.webProxy.respond(message, { respondCreateProgram: frameNodeToDisplayProgram(fqNode.toNodes()[0] as FrameNode) });
  }
};

export const respondLinearContextGraph: Handler = async (message, context) => {
  if (!message.requestLinearContextGraph) return;

  const leafNodes = message.requestLinearContextGraph.leafIds.map((id) => figma.getNodeById(id)).filter(Boolean) as SceneNode[];
  if (!leafNodes.length) return;

  const reachableConnectorIds: string[] = [];
  const isInConnector = selectInConnectors();
  let hasCycle = false;

  // first traverse, gather all edges
  leafNodes.forEach((leafNode) => {
    let hasCycleFromLeaf = false;
    const reachableConnectorIdsFromLeaf = new Set<string>();
    traverse([leafNode], {
      onConnector: (connector, sourceNode) => {
        const isInEdge = isInConnector(connector, sourceNode); // go upstream

        if (isInEdge) {
          if (reachableConnectorIdsFromLeaf.has(connector.id)) {
            hasCycleFromLeaf = true;
            return false;
          }

          reachableConnectorIdsFromLeaf.add(connector.id);
        }

        return isInEdge;
      },
    });

    if (hasCycleFromLeaf) {
      hasCycle = true;
    }
    reachableConnectorIds.push(...reachableConnectorIdsFromLeaf);
  });

  const uniqueReachableConnectorIds = new Set(reachableConnectorIds);

  if (hasCycle) {
    replaceNotification("Cycle detected in graph", { error: true });
    return;
  }

  // find leaf nodes that are not connected to any other leaf nodes
  const qualifiedLeafNodes = leafNodes.filter((candidateLeafNode) => {
    return getOutConnectors(candidateLeafNode).every((connector) => !uniqueReachableConnectorIds.has(connector.id));
  }) as FrameNode[];

  console.log("reachable connectors", [...uniqueReachableConnectorIds]);
  const sortedNodes = sortUpstreamNodes(qualifiedLeafNodes, uniqueReachableConnectorIds) as FrameNode[];
  console.log("upstreamContext", sortedNodes.map(frameNodeToDisplayProgram));
};

export const respondPathFromRoot: Handler = async (message, context) => {
  if (!message.requestPathFromRoot) {
    return;
  }

  // traverseGraphAbove
  const targetNode = figma.getNodeById(message.requestPathFromRoot);
  if (!targetNode) {
    replaceNotification(`Error finding node with id ${message.requestContextPath}`, { error: true });
    context.webProxy.respond(message, { respondPathFromRoot: [] });
    return;
  }

  const results = [] as DisplayProgram[];
  traverse([targetNode as SceneNode], {
    onConnector: selectInConnectors(),
    onPreVisit: (node) => results.unshift(frameNodeToDisplayProgram(node as FrameNode)),
  });

  context.webProxy.respond(message, { respondPathFromRoot: results });
};
