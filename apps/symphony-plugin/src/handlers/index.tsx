import type { WebProxy } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@symphony/types";
import { DebugNode } from "../components/debug-node";
import { ChangeTracker } from "../utils/change-tracker";
import { $ } from "../utils/fq";
import { getLinearUpstreamGraph } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { frameNodeToOperatorNode, selectionToOperatorNodes } from "../utils/operator-node";

// selection handler
const selectedProgramChangeTracker = new ChangeTracker();

export const onSelectionChange = (context: HandlerContext, selection: readonly SceneNode[]) => {
  const selectedPrograms = selectionToOperatorNodes(selection);

  if (selectedProgramChangeTracker.next(selectedPrograms.map((p) => JSON.stringify({ id: p.id, config: p.config })))) {
    const upstreamGraph = getLinearUpstreamGraph(selectedPrograms.map((p) => p.id));
    if (upstreamGraph.hasCycle) replaceNotification("Remove the cycle to continue", { error: true });

    context.webProxy.notify({
      upstreamGraphChanged: upstreamGraph.nodes.map((node) => ({
        ...frameNodeToOperatorNode(node),
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

export const onNotifyCreateDebugOperator: Handler = async (context, message) => {
  if (!message.notifyCreateDebugOperator) return;

  const node = $([await figma.createNodeFromJSXAsync(<DebugNode {...message.notifyCreateDebugOperator} />)]).setPluginData({
    type: "operator",
    subtype: message.notifyCreateDebugOperator.name,
    data: JSON.stringify(message.notifyCreateDebugOperator.data),
  });

  node.appendTo(figma.currentPage);
};

export const onShowNotification: Handler = (_context, message) => {
  if (!message.showNotification) return;
  replaceNotification(message.showNotification.message, message.showNotification.config);
};

export const onWebClientStarted: Handler = (context, message) => {
  if (!message.webClientStarted) return;
  onSelectionChange(context, figma.currentPage.selection);
};
