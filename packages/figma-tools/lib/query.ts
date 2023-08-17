export type RelativeDirection = "Up" | "Down" | "Left" | "Right";

export function closest<T extends SceneNode>(predicate: (node: SceneNode) => Boolean, node: SceneNode): null | T {
  if (predicate(node)) {
    return node as T;
  }

  if (!node.parent) return null;

  return closest<T>(predicate, node.parent as SceneNode); // TODO questionable typing
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

export function getNodesDisplayName(nodes: readonly SceneNode[]) {
  switch (nodes.length) {
    case 0:
      return "N/A";
    case 1:
      return nodes[0].name;
    default:
      return "Mixed";
  }
}

export function isInnerOuter(innerRect: Rect, outerRect: Rect) {
  return (
    innerRect.x >= outerRect.x &&
    innerRect.y >= outerRect.y &&
    innerRect.x + innerRect.width <= outerRect.x + outerRect.width &&
    innerRect.y + innerRect.height <= outerRect.y + outerRect.height
  );
}

export function canBeInnerOuter(innerCandidate: Rect, outerCandidate: Rect) {
  return innerCandidate.width <= outerCandidate.width && innerCandidate.height <= outerCandidate.height;
}

export function getAbsoluteBoundingBox(nodes: readonly SceneNode[]): Rect {
  const nodeBoundingBoxes = nodes.map((node) => node.absoluteBoundingBox!).filter(Boolean);
  if (nodeBoundingBoxes.length === 0) throw new Error("At least one node is required");

  const x = Math.min(...nodeBoundingBoxes.map((box) => box.x));
  const y = Math.min(...nodeBoundingBoxes.map((box) => box.y));
  const maxX = Math.max(...nodeBoundingBoxes.map((box) => box.x + box.width));
  const maxY = Math.max(...nodeBoundingBoxes.map((box) => box.y + box.height));

  return {
    x,
    y,
    width: maxX - x,
    height: maxY - y,
  };
}

export interface BoundingNodes {
  top: SceneNode[];
  right: SceneNode[];
  left: SceneNode[];
  bottom: SceneNode[];
}
export function getBoundingNodes(nodes: readonly SceneNode[]): BoundingNodes {
  const allNodesBox = getAbsoluteBoundingBox(nodes);

  const result: BoundingNodes = {
    top: [],
    right: [],
    bottom: [],
    left: [],
  };

  nodes.forEach((node) => {
    const nodeBox = node.absoluteBoundingBox;
    if (!nodeBox) return;

    if (nodeBox.x === allNodesBox.x) result.left.push(node);
    if (nodeBox.x + nodeBox.width === allNodesBox.x + allNodesBox.width) result.right.push(node);
    if (nodeBox.y === allNodesBox.y) result.top.push(node);
    if (nodeBox.y + nodeBox.height === allNodesBox.y + allNodesBox.height) result.bottom.push(node);
  });

  return result;
}

export function getEssentialAnchorNode(direction: RelativeDirection, anchorNodes: SceneNode[]) {
  switch (direction) {
    case "Up":
      return getBoundingNodes(getBoundingNodes(anchorNodes).top).left[0];
    case "Down":
      return getBoundingNodes(getBoundingNodes(anchorNodes).bottom).left[0];
    case "Left":
      return getBoundingNodes(getBoundingNodes(anchorNodes).left).top[0];
    case "Right":
      return getBoundingNodes(getBoundingNodes(anchorNodes).right).top[0];
  }
}

export function sortByDistance<T extends SceneNode>(nodes: readonly T[], center: Vector): T[] {
  const sortable = nodes.filter((node) => node.absoluteBoundingBox);
  return sortable
    .map((node) => {
      const nodeCenter = {
        x: node.absoluteBoundingBox!.x + node.absoluteBoundingBox!.width / 2,
        y: node.absoluteBoundingBox!.y + node.absoluteBoundingBox!.height / 2,
      };
      const distance = Math.sqrt(Math.pow(center.x - nodeCenter.x, 2) + Math.pow(center.y - nodeCenter.y, 2));
      return { node, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .map((item) => item.node);
}

export interface Layout {
  padding?: number;
  gap?: number;
}

export function getNextHorizontalTilePosition(tile: SceneNode, container: SectionNode, layout: Layout = {}): { x: number; y: number } {
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

export function getNextVerticalTilePosition(tile: SceneNode, container: SectionNode, layout: Layout = {}): { x: number; y: number } {
  const { gap = 16, padding = 40 } = layout;

  const maxChildY = Math.max(...container.children.map((child) => child.y + child.height), 0 - gap + padding);
  return {
    x: padding,
    y: maxChildY + gap,
  };
}
