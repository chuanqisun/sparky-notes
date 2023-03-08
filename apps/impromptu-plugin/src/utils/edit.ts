import { getNextTilePosition } from "./query";

export function moveStickiesToSection(stickies: StickyNode[], parentSection: SectionNode) {
  // todo combine into single iteration

  stickies.forEach((stickyNode) => {
    const { x, y } = getNextTilePosition(stickyNode, parentSection);

    const originalParent = stickyNode.parent;
    if (originalParent && originalParent.type === "SECTION") resizeToHugContent(originalParent);
    parentSection.appendChild(stickyNode);

    stickyNode.x = x;
    stickyNode.y = y;

    resizeToHugContent(parentSection);
  });
}

export interface Layout {
  padding?: number;
}
export function resizeToHugContent(targetNode: SectionNode, layout: Layout = {}) {
  const { padding = 40 } = layout;
  const originalWidth = targetNode.width;
  const childMaxX = Math.max(padding, Math.max(...targetNode.children.map((child) => child.x + child.width)));
  const childMaxY = Math.max(padding, Math.max(...targetNode.children.map((child) => child.y + child.height)));

  targetNode.resizeWithoutConstraints(childMaxX + padding, childMaxY + padding);
  targetNode.x += (originalWidth - targetNode.width) / 2;
}

export function joinWithConnector(source: SceneNode, target: SceneNode) {
  const connector = figma.createConnector();
  connector.connectorStart = {
    endpointNodeId: source.id,
    magnet: "BOTTOM",
  };
  connector.connectorEnd = {
    endpointNodeId: target.id,
    magnet: "TOP",
  };
}

export interface Layout {
  horizontalGap?: number;
  verticalGap?: number;
}
export function moveToUpstreamPosition(nodes: SceneNode[], reference: SceneNode, layout: Layout = {}) {
  if (!nodes.length) return;

  const { horizontalGap = 100, verticalGap = 200 } = layout;

  const totalWidth = nodes.reduce((acc, node) => acc + node.width, 0) + horizontalGap * (nodes.length - 1);
  let startX = reference.x + reference.width / 2 - totalWidth / 2;

  nodes.reduce((acc, node) => {
    node.x = acc;
    node.y = reference.y - node.height - verticalGap;
    return acc + node.width + horizontalGap;
  }, startX);
}

export function moveToDownstreamPosition(nodes: SceneNode[], reference: SceneNode, layout: Layout = {}) {
  if (!nodes.length) return;

  const { horizontalGap = 100, verticalGap = 200 } = layout;

  const totalWidth = nodes.reduce((acc, node) => acc + node.width, 0) + horizontalGap * (nodes.length - 1);
  let startX = reference.x + reference.width / 2 - totalWidth / 2;

  nodes.reduce((acc, node) => {
    node.x = acc;
    node.y = reference.y + reference.height + verticalGap;
    return acc + node.width + horizontalGap;
  }, startX);
}
