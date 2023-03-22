import { getWebProxy } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@symphony/types";
import { QuestionNode, TaskNode } from "./components/program-node";
import { getFieldByLabel } from "./components/text-field";
import { $ } from "./utils/fq";
import { selectInEdgesFromTopOrLeftNodes, traverse } from "./utils/graph";
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

  const selectedPrograms = programNodes.map((node) => {
    const subtype = node.getPluginData("subtype");
    return {
      id: node.id,
      subtype,
      input: getFieldByLabel(subtype, node)!.value.characters.trim(),
    };
  });

  webProxy.notify({ programSelectionChanged: selectedPrograms });
}

async function handleMessage(message: MessageToFigma) {
  if (message.requestContext) {
    // traverseGraphAbove
    const targetNode = figma.getNodeById(message.requestContext);
    if (!targetNode) return "";

    const results: any[] = [];

    console.log("will traverse", targetNode);

    traverse([targetNode as SceneNode], {
      onPreVisit: (node) => results.push(node),
      onConnector: selectInEdgesFromTopOrLeftNodes(),
    });

    console.log(results);
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
