import { getWebProxy } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@symphony/types";
import {
  HandlerContext,
  onSelectionChange,
  onShowNotification,
  onWebClientStarted,
  respondCreateProgram,
  respondCreateSpatialProgram,
  respondLinearContextGraph,
  respondViewportPrograms as respondAmbientNodes,
} from "./handlers";
import { frameNodeLayersToContextPath } from "./utils/display-program";
import { $ } from "./utils/fq";
import { collectContextPath, selectInEdgesFromTopOrLeftNodes, traverse } from "./utils/graph";
import { showUI } from "./utils/show-ui";

const webProxy = getWebProxy<MessageToWeb, MessageToFigma>();

async function main() {
  figma.on("selectionchange", () => onSelectionChange({ webProxy }, figma.currentPage.selection));
  figma.ui.on("message", handleMessage);

  showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 600, width: 420 });
}

main();

async function handleMessage(message: MessageToFigma) {
  // v2 handlers
  const context: HandlerContext = {
    webProxy,
  };

  onShowNotification(context, message);
  onWebClientStarted(context, message);
  respondCreateProgram(context, message);
  respondCreateSpatialProgram(context, message);
  respondLinearContextGraph(context, message);
  respondAmbientNodes(context, message);

  // v1 handlers
  if (message.requestContextPath) {
    // traverseGraphAbove
    const targetNode = figma.getNodeById(message.requestContextPath);
    if (!targetNode) return "";

    const layers: FrameNode[][] = [[targetNode as FrameNode]];
    traverse([targetNode as SceneNode], {
      onConnector: selectInEdgesFromTopOrLeftNodes(collectContextPath(layers)),
    });
    const contextPath = frameNodeLayersToContextPath(layers);
    webProxy.respond(message, { respondContextPath: contextPath });
  }

  if (message.requestRemoveDownstreamNode) {
    const parentNode = figma.getNodeById(message.requestRemoveDownstreamNode) as SceneNode;
    if (!parentNode) return;
    $([parentNode]).subtree().remove();
  }

  // Deprecated
  if (message.requestCreateSerialTaskNodes) {
    const parentNode = figma.getNodeById(message.requestCreateSerialTaskNodes!.parentId) as SceneNode;
    if (!parentNode) return;

    const taskNodes = [] as any[];

    $(taskNodes)
      .setPluginData({ type: "programNode", subtype: "Task" })
      .appendTo(figma.currentPage)
      .distribute("left-to-right", 100)
      .chainWithConnectors({ sourceMagnet: "LEFT", targetMagnet: "RIGHT" })
      .align("vertical-center")
      .hangBottomLeft(figma.getNodeById(message.requestCreateSerialTaskNodes!.parentId) as SceneNode, 150)
      .zoomOutViewToContain()
      .select();

    $([parentNode, ...$(taskNodes).first().toNodes()]).chainWithConnectors({ sourceMagnet: "BOTTOM", targetMagnet: "TOP" });
  }
}
