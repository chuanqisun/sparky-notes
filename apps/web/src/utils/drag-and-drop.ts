import type { WebDragContext } from "@sticky-plus/figma-ipc-types";
import { isNative } from "./agent";

export function getDragContext(e: DragEvent): WebDragContext {
  return {
    offsetX: e.offsetX,
    offsetY: e.offsetY,
    nodeWidth: (e.target as HTMLElement).offsetWidth,
    nodeHeight: (e.target as HTMLElement).offsetHeight,
  };
}

export function isFigmaWebDragEnd(e: DragEvent) {
  console.log("Checking is drag ended in Figma Web", e);

  // It must NOT be the native app. (check: agent.navigator)
  if (isNative()) return false;

  // It must block drop effect. (check: event.dataTransfer.dropEffect === "none")
  const isDropBlocked = e.dataTransfer?.dropEffect === "none";
  if (!isDropBlocked) return false;

  // It must be outside of plugin iframe. (It's INSIDE when 0 < event.clientX < window.innerWidth, 0 < event.clientY < window.innerHeight)
  const isInsideIframe = 0 < e.clientX && e.clientX < window.innerWidth && 0 < e.clientY && e.clientY < window.innerHeight;
  if (isInsideIframe) return false;

  // It must be inside of Figma app window. (window.screenTop < event.screenY < window.screenTop + window.outerHeight, window.screenLeft < event.screenX < window.screenLeft + window.outerWidth)
  const isInsideFigmaApp =
    window.screenTop < e.screenY &&
    e.screenY < window.screenTop + window.outerHeight &&
    window.screenLeft < e.screenX &&
    e.screenX < window.screenLeft + window.outerWidth;
  if (!isInsideFigmaApp) return false;

  // TODO (Impossible to check?) It must be inside of Figma canvas area
  return true;
}
