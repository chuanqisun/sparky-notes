import type { MessageToFigma, MessageToWeb } from "@sticky-plus/figma-ipc-types";
import type { ProxyToWeb } from "@sticky-plus/figma-tools";
import { getFigmaDropContext, getSyntheticDragContext } from "../utils/drag-and-drop";

export function handleDropLinks(event: DropEvent, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  const { items } = event;
  if (items.length === 0) return;

  const htmlChunks = items.filter((item) => item.type === "text/html").map((item) => item.data);
  if (htmlChunks.length === 0) return;

  proxyToWeb.notify({
    parseDropHtml: {
      items: htmlChunks,
      figmaDropContext: getFigmaDropContext(event),
      webDragContext: getSyntheticDragContext(),
    },
  });
}
