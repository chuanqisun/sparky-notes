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

export function resizeToHugContent(layout: { padding?: number; minHeight?: number; minWidth?: number }, nodes: SceneNode[]) {
  const { padding = 40, minWidth = 0, minHeight = 0 } = layout;

  nodes
    .filter((node) => (node as SectionNode)?.children && (node as SectionNode).resizeWithoutConstraints)
    .forEach((targetNode) => {
      const childMaxX = Math.max(0, ...(targetNode as ChildrenMixin).children.map((child) => child.x + child.width));
      const childMaxY = Math.max(0, ...(targetNode as ChildrenMixin).children.map((child) => child.y + child.height));

      (targetNode as SectionNode).resizeWithoutConstraints(Math.max(minWidth, childMaxX + padding), Math.max(minHeight, childMaxY + padding));
    });

  return nodes;
}

export function appendAsTiles(parent: SectionNode, tiles: SceneNode[], layoutFn: (parent: SectionNode, tile: SceneNode) => { x: number; y: number }) {
  tiles.forEach((tile) => {
    const { x, y } = layoutFn(parent, tile);

    parent.appendChild(tile);

    tile.x = x;
    tile.y = y;

    resizeToHugContent({}, [parent]);
  });

  return tiles;
}
