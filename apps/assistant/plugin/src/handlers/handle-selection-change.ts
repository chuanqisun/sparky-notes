import type { ContentNode, MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { type ProxyToWeb } from "@h20/figma-tools";

export function handleSelectionChange(proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  proxyToWeb.notify({ selectionChanged: getCurrentSelection() });
}

export function getCurrentSelection() {
  const contentNodes = getContentNodes(figma.currentPage.selection);

  return {
    contentNodes,
  };
}

function getContentNodes(selection: readonly SceneNode[]): ContentNode[] {
  return selection.map((item) => getContentNodeInternal(item)).filter(isNotNull);
}

function getContentNodeInternal(node: SceneNode): ContentNode | null {
  if (node.type === "STICKY") {
    return {
      id: node.id,
      type: "sticky",
      content: node.text.characters,
    };
  } else if (node.type === "SECTION") {
    return {
      id: node.id,
      type: "section",
      content: node.name,
      children: node.children.map(getContentNodeInternal).filter(isNotNull),
    };
  } else {
    return null;
  }
}

function isNotNull<T>(item: T | null): item is T {
  return item !== null;
}
