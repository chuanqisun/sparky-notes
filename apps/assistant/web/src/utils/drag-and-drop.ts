import type { WebDragContext } from "@h20/assistant-types";

export function getDragContext(e: DragEvent): WebDragContext {
  return {
    offsetX: e.offsetX,
    offsetY: e.offsetY,
    nodeWidth: (e.target as HTMLElement).offsetWidth,
    nodeHeight: (e.target as HTMLElement).offsetHeight,
  };
}
