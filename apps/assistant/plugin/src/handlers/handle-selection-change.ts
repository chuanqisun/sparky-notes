import type { MessageToFigma, MessageToWeb, SerializedShelf, ShelfChild, ShelfNode } from "@h20/assistant-types";
import { walk, type ProxyToWeb } from "@h20/figma-tools";

export function handleSelectionChange(proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  proxyToWeb.notify({ selectionChanged: getCurrentSelection() });
}

export function getCurrentSelection() {
  const stickyNodes: StickyNode[] = [];
  const abstractShelves: SerializedShelf[] = [];
  walk(figma.currentPage.selection, {
    onPreVisit: (candidate) => {
      if (candidate.type === "STICKY") {
        stickyNodes.push(candidate);
      }
      if (candidate.getPluginDataKeys().includes("shelfData") && candidate.type === "SHAPE_WITH_TEXT") {
        abstractShelves.push({ id: candidate.id, rawData: candidate.getPluginData("shelfData"), name: candidate.name });
      }
    },
    onShouldVisitChild: (candidate) => candidate.type === "SECTION" || candidate.type === "STICKY" || candidate.type === "SHAPE_WITH_TEXT",
  });

  const dataNode = getDataNode(figma.currentPage.selection);

  const stickies = stickyNodes.map((sticky) => ({
    id: sticky.id,
    text: sticky.text.characters.trim(),
    color: "",
  }));

  return {
    stickies,
    abstractShelves,
    shelfNode: dataNode,
  };
}

function getDataNode(selection: readonly SceneNode[]): ShelfNode {
  const rootShelf: ShelfNode = {
    isRoot: true,
    children: selection.map((item) => getDataNodeInternal(item)).filter((shelf) => shelf !== null) as ShelfChild[],
  };

  return rootShelf;
}

function getDataNodeInternal(node: SceneNode): ShelfChild | null {
  if (node.type === "STICKY") {
    return node.text.characters;
  } else if (node.type === "SECTION") {
    const shelf: ShelfNode = {
      name: node.name,
      children: node.children.map(getDataNodeInternal).filter((item) => item !== null) as ShelfChild[],
    };

    return shelf;
  } else {
    return null;
  }
}
