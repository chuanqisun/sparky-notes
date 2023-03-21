import type { MessageToFigma } from "@symphony/types";
import { ProgramNode } from "./components/program-node";
import { $ } from "./utils/fq";
import { getNodesDisplayName } from "./utils/query";
import { notifyUI } from "./utils/rpc";
import { showUI } from "./utils/show-ui";

async function main() {
  figma.on("selectionchange", () => handleSelection(figma.currentPage.selection));
  figma.ui.on("message", handleMessage);

  showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 600, width: 420 });
}

main();

function handleSelection(nodes: readonly SceneNode[]) {
  notifyUI({ graphSelection: { nodeName: getNodesDisplayName(nodes) } });
}

async function handleMessage(message: MessageToFigma) {
  if (message.requestGraphSelection) {
    handleSelection(figma.currentPage.selection);
  }
  if (message.requestCreateProgramNode) {
    (await $(<ProgramNode />)).first().appendTo(figma.currentPage).center().fit();
  }
}
