import type { MessageToFigma } from "@sticky-plus/figma-ipc-types";

export async function handleZoomIntoViewByNames(message: MessageToFigma) {
  if (!message.zoomIntoViewByNames) return;

  const matchedNodes = figma.currentPage
    .findAllWithCriteria({ types: ["FRAME", "COMPONENT"] })
    .filter((node) => message.zoomIntoViewByNames!.includes(node.name));

  figma.currentPage.selection = [...matchedNodes];
  figma.viewport.scrollAndZoomIntoView(matchedNodes);
}
