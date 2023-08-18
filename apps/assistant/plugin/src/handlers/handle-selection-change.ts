import type { AbstractShelf, DataNode, DataNodeItem, MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { walk, type ProxyToWeb } from "@h20/figma-tools";

export function handleSelectionChange(proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  const stickyNodes: StickyNode[] = [];
  const abstractShelves: AbstractShelf[] = [];

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

  proxyToWeb.notify({ selectionChanged: { stickies, abstractShelves, dataNode } });
}

function getDataNode(selection: readonly SceneNode[]): DataNode {
  const rootShelf: DataNode = {
    isRoot: true,
    children: selection.map((item) => getDataNodeInternal(item)).filter((shelf) => shelf !== null) as DataNodeItem[],
  };

  return rootShelf;
}

function getDataNodeInternal(node: SceneNode): DataNodeItem | null {
  if (node.type === "STICKY") {
    return node.text.characters;
  } else if (node.type === "SECTION") {
    const shelf: DataNode = {
      name: node.name,
      children: node.children.map(getDataNodeInternal).filter((item) => item !== null) as DataNodeItem[],
    };

    return shelf;
  } else {
    return null;
  }
}
