import type { FigmaDropContext, WebDragContext } from "@h20/assistant-types";

export function getFigmaDropContext(dropEvent: DropEvent): FigmaDropContext {
  return {
    parentNodeId: dropEvent.node.id,
    x: dropEvent.x,
    y: dropEvent.y,
    absoluteX: dropEvent.absoluteX,
    absoluteY: dropEvent.absoluteY,
  };
}

export function getSyntheticDragContext(): WebDragContext {
  return {
    nodeWidth: 200,
    nodeHeight: 80,
    offsetX: 100,
    offsetY: 0,
  };
}
