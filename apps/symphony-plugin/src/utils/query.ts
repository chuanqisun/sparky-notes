export function closest<T extends SceneNode>(predicate: (node: SceneNode) => Boolean, node: SceneNode): null | T {
  if (predicate(node)) {
    return node as T;
  }

  if (!node.parent) return null;

  return closest<T>(predicate, node.parent as SceneNode); // TODO questionable typing
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

export interface Point {
  x: number;
  y: number;
}

export function getNodeAbsolutePosition(node: SceneNode): Point {
  if (!(node.parent as SceneNode)?.x) {
    return { x: node.x, y: node.y };
  } else {
    const parentPosition = getNodeAbsolutePosition(node.parent as SceneNode);
    return {
      x: node.x + parentPosition.x,
      y: node.y + parentPosition.y,
    };
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

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function getAbsoluteBoundingRect(nodes: readonly SceneNode[]): Rect {
  if (nodes.length === 0) throw new Error("At least one node is required");

  if (nodes.length === 1) {
    const pos = getNodeAbsolutePosition(nodes[0]);
    return {
      x: pos.x,
      y: pos.y,
      width: nodes[0].width,
      height: nodes[0].height,
    };
  }

  const nodeBoundingBoxes = nodes.map((node) => getAbsoluteBoundingRect([node]));

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
