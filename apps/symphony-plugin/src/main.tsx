import { getWebProxy } from "@h20/figma-relay";
import type { MessageToFigma } from "@symphony/types";
import { QuestionNode, TaskNode } from "./components/program-node";
import { getFieldByLabel } from "./components/text-field";
import { $ } from "./utils/fq";
import { getNodesDisplayName } from "./utils/query";
import { showUI } from "./utils/show-ui";

async function main() {
  figma.on("selectionchange", () => handleSelection(figma.currentPage.selection));
  figma.ui.on("message", handleMessage);

  showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 600, width: 420 });
}

main();

const webProxy = getWebProxy();

function handleSelection(nodes: readonly SceneNode[]) {
  webProxy.notify({ graphSelection: { nodeName: getNodesDisplayName(nodes) } });
}

async function handleMessage(message: MessageToFigma) {
  if (message.requestGraphSelection) {
    handleSelection(figma.currentPage.selection);
  }

  if (message.requestCreateProgramNode) {
    const node = await figma.createNodeFromJSXAsync(
      <QuestionNode input="How to conduct a literature review on usability issues with the “Create new link” pattern?" />
    );
    $([node]).first().setPluginData({ type: "programNode", subType: "question" }).appendTo(figma.currentPage).moveToViewCenter().fitInView().select();
  }

  if (message.requestRemoveDownstreamNode) {
    const parentNode = figma.getNodeById(message.requestRemoveDownstreamNode) as SceneNode;
    if (!parentNode) return;
    $([parentNode])
      .reachableGraphNodes()
      .filter((node) => node.id !== parentNode.id)
      .remove();
  }

  if (message.requestSelectedPrograms) {
    const programNodes = $(figma.currentPage.selection)
      .closest((node) => node.getPluginData("type") === "programNode")
      .first()
      .toNodes<FrameNode>();

    const selectedPrograms = programNodes.map((node) => ({
      id: node.id,
      input: getFieldByLabel("Question", node)!.value.characters.trim(),
    }));

    webProxy.respond(message, { respondSelectedPrograms: selectedPrograms });
  }

  if (message.requestCreateSerialTaskNodes) {
    const parentNode = figma.getNodeById(message.requestCreateSerialTaskNodes!.parentId) as SceneNode;
    if (!parentNode) return;

    const taskNodes = await Promise.all(
      message.requestCreateSerialTaskNodes.taskDescriptions.map((input) => figma.createNodeFromJSXAsync(<TaskNode input={input} />))
    );

    $(taskNodes)
      .setPluginData({ type: "programNode", subType: "task" })
      .appendTo(figma.currentPage)
      .distribute("left-to-right", 100)
      .connect("right")
      .align("vertical-center")
      .moveToBottomCenter(figma.getNodeById(message.requestCreateSerialTaskNodes!.parentId) as SceneNode, 150)
      .fitInView();

    $([parentNode, ...$(taskNodes).first().toNodes()]).connect("down");
    $([...$(taskNodes).last().toNodes(), parentNode]).connect("up");
  }
}
