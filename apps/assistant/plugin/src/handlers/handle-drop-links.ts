import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import type { ProxyToWeb } from "@h20/figma-tools";

export function handleDropLinks(event: DropEvent, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  const { items } = event;
  if (items.length === 0) return;

  const htmlChunks = items.filter((item) => item.type === "text/html").map((item) => item.data);
  proxyToWeb.notify({
    dropHtml: {
      items: htmlChunks,
      context: {
        parentNodeId: event.node.id,
        x: event.x,
        y: event.y,
        absoluteX: event.absoluteX,
        absoluteY: event.absoluteY,
      },
    },
  });
}
