import type { WebProxy } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@symphony/types";
import { DebugNode } from "../components/debug-node";
import { getFieldByLabel } from "../components/text-field";
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
  if (!message.createDebugOperator) return;

  const node = $([await figma.createNodeFromJSXAsync(<DebugNode {...message.createDebugOperator} />)]).setPluginData({
    type: "operator",
    subtype: message.createDebugOperator.name,
    data: message.createDebugOperator.data,
  });

  node.appendTo(figma.currentPage);
};

export const onSetOperatorData: Handler = (context, message) => {
  if (!message.setOperatorData) return;

  const node = figma.getNodeById(message.setOperatorData.id) as FrameNode;
  if (!node) return;

  $([node]).setPluginData({ data: message.setOperatorData.data });
  getFieldByLabel("Data", node)!.value.characters = `Updated on ${new Date().toLocaleTimeString()}`;
};

export const onShowNotification: Handler = (_context, message) => {
  if (!message.showNotification) return;
  replaceNotification(message.showNotification.message, message.showNotification.config);
};

export const onWebClientStarted: Handler = (context, message) => {
  if (!message.webClientStarted) return;
  onSelectionChange(context, figma.currentPage.selection);
};
