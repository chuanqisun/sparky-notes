import type { ContentNode, MessageToFigma, MessageToWeb } from "@sparky-notes/figma-ipc-types";
import { type ProxyToWeb } from "@sparky-notes/figma-tools";

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
  switch (node.type) {
    case "STICKY":
      return {
        id: node.id,
        type: "sticky",
        content: node.text.characters,
      };
    case "TEXT":
      return {
        id: node.id,
        type: "text",
        content: node.characters,
      };
    case "FRAME":
    case "INSTANCE":
    case "GROUP":
    case "SECTION":
      return {
        id: node.id,
        type: "section",
        content: node.name,
        children: node.children.map(getContentNodeInternal).filter(isNotNull),
      };
    default:
      if (typeof node.exportAsync === "function") {
        return {
          id: node.id,
          type: "visual",
          content: node.name,
        };
      }
      return null;
  }
}

function isNotNull<T>(item: T | null): item is T {
  return item !== null;
}
