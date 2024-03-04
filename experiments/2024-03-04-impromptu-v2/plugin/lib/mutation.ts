import { getAbsoluteBoundingBox } from "./query";

export function moveToViewCenter(nodes: SceneNode[]) {
  const rect = getAbsoluteBoundingBox(nodes);
  const rectCenter = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
  const translateX = figma.viewport.center.x - rectCenter.x;
  const translateY = figma.viewport.center.y - rectCenter.y;

  return translate(translateX, translateY, nodes);
}

export function translate(x: number, y: number, nodes: SceneNode[]) {
  nodes.forEach((node) => {
    node.x += x;
    node.y += y;
  });

  return nodes;
}
