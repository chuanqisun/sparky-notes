import { getWebProxy } from "@h20/figma-relay";
import type { MessageToFigma } from "@symphony/types";
import { ProgramNode } from "./components/program-node";
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
    const node = await figma.createNodeFromJSXAsync(<ProgramNode />);
    $([node]).first().setPluginData({ type: "programNode" }).appendTo(figma.currentPage).center().fit();
  }
  if (message.requestSelectedPrograms) {
    const programNodes = $(figma.currentPage.selection)
      .closest((node) => node.getPluginData("type") === "programNode")
      .first()
      .toNodes<FrameNode>();

    const selectedPrograms = programNodes.map((node) => ({
      id: node.id,
      input: getFieldByLabel("Input", node)!.value.characters.trim(),
    }));

    webProxy.respond(message, { respondSelectedPrograms: selectedPrograms });
  }
}
