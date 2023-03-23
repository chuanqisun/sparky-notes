import type { WebProxy } from "@h20/figma-relay";
import type { DisplayProgram, MessageToFigma, MessageToWeb } from "@symphony/types";
import { ThoughtNode } from "../components/program-node";
import { frameNodeToDisplayProgram, selectionNodesToDisplayPrograms } from "../utils/display-program";
import { $ } from "../utils/fq";
import { selectInEdges, traverse } from "../utils/graph";
import { replaceNotification } from "../utils/notify";

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

export const respondCreateDownstreamProgram: Handler = async (message, context) => {
  if (!message.requestCreateDownstreamProgram) {
    return;
  }

  const messageData = message.requestCreateDownstreamProgram;
  switch (messageData.subtype) {
    case "Thought":
      const node = await figma.createNodeFromJSXAsync(<ThoughtNode input={messageData.input} />);
      const parentNode = messageData.parentId ? (figma.getNodeById(messageData.parentId) as FrameNode) : null;
      const fqNode = $([node]).appendTo(figma.currentPage).setPluginData({ type: "programNode", subtype: "Thought" });
      if (parentNode) {
        fqNode.moveToBottomLeft(parentNode, 100).select().moveViewToCenter().zoomOutViewToFit();
        $([parentNode, node]).connect("down");
      } else {
        fqNode.select().moveToViewCenter().zoomOutViewToFit();
      }
      context.webProxy.respond(message, { respondCreateDownstreamProgram: frameNodeToDisplayProgram(node as FrameNode) });
      break;
    default:
      replaceNotification(`Invalid subtype "${message.requestCreateDownstreamProgram}"`, { error: true });
      return;
  }
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
    onConnector: selectInEdges(),
    onPreVisit: (node) => results.unshift(frameNodeToDisplayProgram(node as FrameNode)),
  });

  context.webProxy.respond(message, { respondPathFromRoot: results });
};
