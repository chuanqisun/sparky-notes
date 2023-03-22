import { getWebProxy } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@symphony/types";
import { QuestionNode, TaskNode } from "./components/program-node";
import { $ } from "./utils/fq";
import { collectContextPath, selectInEdgesFromTopOrLeftNodes, traverse } from "./utils/graph";
import { frameNodeLayersToContextPath, frameNodeToProgramNode } from "./utils/program-node";
import { showUI } from "./utils/show-ui";

async function main() {
  figma.on("selectionchange", () => handleSelection(figma.currentPage.selection));
  figma.ui.on("message", handleMessage);

  showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 600, width: 420 });
}

main();

const webProxy = getWebProxy<MessageToWeb, MessageToFigma>();

function handleSelection(nodes: readonly SceneNode[]) {
  const programNodes = $(nodes)
    .closest((node) => node.getPluginData("type") === "programNode")
    .toNodes<FrameNode>();

  const selectedPrograms = programNodes.map(frameNodeToProgramNode);

  webProxy.notify({ programSelectionChanged: selectedPrograms });
}

async function handleMessage(message: MessageToFigma) {
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

  if (message.requestCreateProgramNode) {
    const node = await figma.createNodeFromJSXAsync(
      <QuestionNode input="How to conduct a literature review on usability issues with the “Create new link” pattern?" />
    );
    $([node]).first().setPluginData({ type: "programNode", subtype: "Question" }).appendTo(figma.currentPage).moveToViewCenter().zoomOutViewToFit().select();
  }

  if (message.requestRemoveDownstreamNode) {
    const parentNode = figma.getNodeById(message.requestRemoveDownstreamNode) as SceneNode;
    if (!parentNode) return;
    $([parentNode]).subtree().remove();
  }

  if (message.requestCreateSerialTaskNodes) {
    const parentNode = figma.getNodeById(message.requestCreateSerialTaskNodes!.parentId) as SceneNode;
    if (!parentNode) return;

    const taskNodes = await Promise.all(
      message.requestCreateSerialTaskNodes.taskDescriptions.map((input) => figma.createNodeFromJSXAsync(<TaskNode input={input} />))
    );

    $(taskNodes)
      .setPluginData({ type: "programNode", subtype: "Task" })
      .appendTo(figma.currentPage)
      .distribute("left-to-right", 100)
      .connect("right")
      .align("vertical-center")
      .moveToBottomLeft(figma.getNodeById(message.requestCreateSerialTaskNodes!.parentId) as SceneNode, 150)
      .zoomOutViewToFit()
      .select();

    $([parentNode, ...$(taskNodes).first().toNodes()]).connect("down");
  }
}
