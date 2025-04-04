import type { MessageToFigma, MessageToWeb } from "@sparky-notes/figma-ipc-types";
import { type ProxyToWeb } from "@sparky-notes/figma-tools";

export async function handleGetViewport(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.getViewport) return;

  proxyToWeb.respond(message, {
    getViewportResponse: {
      center: figma.viewport.center,
      bounds: figma.viewport.bounds,
    },
  });
}
