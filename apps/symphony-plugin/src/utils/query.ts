import type { SpatialDirection } from "@symphony/types";

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

export function filterToHaveWidgetDataKey(key: string) {
  return function (node: BaseNode): node is WidgetNode {
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

export function getEssentialAnchorNode(direction: SpatialDirection, anchorNodes: SceneNode[]) {
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
