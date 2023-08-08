import { StickySummary } from "@impromptu-demo/types";
import { getNextNodes, getPrevNodes } from "./graph";
import { getProgramNodeGraphHash } from "./hash";
import { sortFPattern } from "./sort";

export function closest<T extends BaseNode>(predicate: (node: BaseNode) => boolean, node: BaseNode): T | null {
  if (!node.parent) return null;

  return predicate(node) ? (node as T) : closest(predicate, node.parent);
}

export function filterToType<T extends BaseNode>(type: BaseNode["type"]) {
  return function (node: BaseNode): node is T {
    return node.type === type;
  };
}

export function filterToPredicate<T extends BaseNode>(predicate: (node: BaseNode) => boolean) {
  return function (node: BaseNode): node is T {
    return predicate(node);
  };
}

export function filterToHaveWidgetDataKey<T extends BaseNode>(key: string) {
  return function (node: BaseNode): node is T {
    return node.getPluginDataKeys().includes(key);
  };
}

export interface AttachedConnector extends ConnectorNode {
  connectorStart: ConnectorEndpointEndpointNodeIdAndMagnet | ConnectorEndpointPositionAndEndpointNodeId;
  connectorEnd: ConnectorEndpointEndpointNodeIdAndMagnet | ConnectorEndpointPositionAndEndpointNodeId;
}

export function filterToAttachedConnector(node: ConnectorNode): node is AttachedConnector {
  if (!(node.connectorStart as ConnectorEndpointEndpointNodeIdAndMagnet).endpointNodeId) return false;
  if (!(node.connectorEnd as ConnectorEndpointEndpointNodeIdAndMagnet).endpointNodeId) return false;
  return true;
}

export interface TextNodeGroup {
  type: "TEXT";
  nodes: TextNode[];
}
export interface StickyNodeGroup {
  type: "STICKY";
  nodes: StickyNode[];
}

export function getChildrenMaxY(section: SectionNode, fallback = 0) {
  let maxBottom = fallback;
  section.findAll((node) => {
    const nodeBottom = node.y + node.height;
    if (nodeBottom > maxBottom) {
      maxBottom = nodeBottom;
    }
    return false;
  });

  return maxBottom;
}

export function getChildrenMinX(section: SectionNode, fallback = 0) {
  let leftEdge = Infinity;

  section.findAll((node) => {
    const nodeX = node.x;
    if (nodeX < leftEdge) {
      leftEdge = nodeX;
    }
    return false;
  });

  return leftEdge === Infinity ? fallback : leftEdge;
}

export function getFirstOutput(node: FrameNode): SectionNode | null {
  const outputContainer = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
  return outputContainer ?? null;
}

export interface Layout {
  padding?: number;
  wrap?: number;
  gap?: number;
}
export function getNextTilePosition(tile: SceneNode, container: SectionNode, layout: Layout = {}): { x: number; y: number } {
  const epsilon = 5;
  const { wrap = 4000, gap = 16, padding = 40 } = layout;

  const lastRowTopEdge = Math.max(Math.max(...container.children.map((child) => child.y)), padding);
  const lastRowMaxX = Math.max(
    Math.max(...container.children.filter((child) => Math.abs(child.y - lastRowTopEdge) < epsilon).map((child) => child.x + child.width)),
    padding - gap
  );

  if (lastRowMaxX + gap + tile.width + padding <= wrap + epsilon) {
    return {
      x: lastRowMaxX + gap,
      y: lastRowTopEdge,
    };
  } else {
    const maxChildY = Math.max(...container.children.map((child) => child.y + child.height));
    return {
      x: padding,
      y: maxChildY + gap,
    };
  }
}

export function getNextTilePositionNewLine(tile: SceneNode, container: SectionNode, layout: Layout = {}): { x: number; y: number } {
  const { gap = 16, padding = 40 } = layout;

  const maxChildY = Math.max(...container.children.map((child) => child.y + child.height), 0 - gap + padding);
  return {
    x: padding,
    y: maxChildY + gap,
  };
}

export function getNextTilePositionNoWrap(tile: SceneNode, container: SectionNode, layout: Layout = {}): { x: number; y: number } {
  const epsilon = 5;
  const { gap = 16, padding = 40 } = layout;

  const lastRowTopEdge = Math.max(Math.max(...container.children.map((child) => child.y)), padding);
  const lastRowMaxX = Math.max(
    Math.max(...container.children.filter((child) => Math.abs(child.y - lastRowTopEdge) < epsilon).map((child) => child.x + child.width)),
    padding - gap
  );

  return {
    x: lastRowMaxX + gap,
    y: lastRowTopEdge,
  };
}

export function getInnerTextNodeGroups(node: SectionNode) {
  const sortedChildren = [...node.children].sort((a, b) => a.y - b.y);
  return sortedChildren.reduce((prev, current) => {
    if (current.type !== "TEXT" && current.type !== "STICKY") return prev;

    if (prev.length === 0) {
      prev.push({ type: current.type, nodes: [current] } as TextNodeGroup | StickyNodeGroup);
      return prev;
    }

    const lastGroupType = prev[prev.length - 1].type;
    if (current.type === lastGroupType) {
      prev[prev.length - 1].nodes.push(current as any);
    } else {
      prev.push({ type: current.type, nodes: [current] } as TextNodeGroup | StickyNodeGroup);
    }

    return prev;
  }, [] as (TextNodeGroup | StickyNodeGroup)[]);
}

export function sourceNodesToText(nodes: SectionNode[]): string {
  return nodes.map(sourceNodeToText).join("\n\n");
}

export function getInnerStickies(nodes: SectionNode[]): StickyNode[] {
  return nodes.flatMap((node) => [...node.children].sort(sortFPattern).filter(filterToType("STICKY")) as StickyNode[]);
}

export function getTextChunks(longText: string, chunkSize: number) {
  const chunks: string[] = [];
  let remainingWords = longText.split(" ");
  while (remainingWords.length) {
    chunks.push(remainingWords.slice(0, chunkSize).join(" "));
    remainingWords = remainingWords.slice(chunkSize);
  }

  return chunks;
}

export function sourceNodeToText(node: SectionNode): string {
  const name = node.name;
  const textItems = getInnerTextNodeGroups(node);
  return `
${name} ###
${textItems
  .map((item) => {
    switch (item.type) {
      case "TEXT":
        return item.nodes
          .map((node) =>
            node.characters
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.length)
          )
          .join("\n");
      case "STICKY":
        return item.nodes
          .map(
            (node) =>
              "- " +
              node.text.characters
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length)
          )
          .join("\n");
    }
  })
  .join("\n\n")}
###`.trim();
}

export function getProgramNodeHash(currentNode: FrameNode) {
  const sourceNodes = getPrevNodes(currentNode).filter(filterToType<SectionNode>("SECTION"));
  const targetNodes = getNextNodes(currentNode).filter(filterToType<SectionNode>("SECTION"));
  const latestHash = getProgramNodeGraphHash(currentNode, sourceNodes, targetNodes);
  return latestHash;
}

export function getStickySummary(node: StickyNode): StickySummary {
  return {
    text: node.name,
    shortContext: node.getPluginData("shortContext"),
    longContext: node.getPluginData("longContext"),
    url: (node.text.hyperlink as HyperlinkTarget)?.value,
  };
}
