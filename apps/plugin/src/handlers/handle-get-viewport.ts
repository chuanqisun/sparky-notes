import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { type ProxyToWeb } from "@h20/figma-tools";

export async function handleGetViewport(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.getViewport) return;

  proxyToWeb.respond(message, {
    getViewportResponse: {
      center: figma.viewport.center,
      bounds: figma.viewport.bounds,
    },
  });
}
