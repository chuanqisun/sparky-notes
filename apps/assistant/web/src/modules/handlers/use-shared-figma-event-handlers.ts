import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import type { ApplicationInsights } from "@microsoft/applicationinsights-web";
import { useEffect } from "preact/hooks";
import { handleAddedCards } from "./handle-added-cards";
import { handleDropHtml } from "./handle-drop-html";

export interface FigmaEventHandlersProps {
  proxyToFigma: ProxyToFigma<MessageToFigma, MessageToWeb>;
  appInsights: ApplicationInsights;
}
export function useSharedFigmaEventHandlers({ proxyToFigma, appInsights }: FigmaEventHandlersProps) {
  useEffect(() => {
    const handleMainMessage = (e: MessageEvent) => {
      const message = e.data.pluginMessage as MessageToWeb;
      console.log(`[ipc] Figma -> Web`, message);
      handleDropHtml(message, proxyToFigma);
      handleAddedCards(message, appInsights);
    };

    window.addEventListener("message", handleMainMessage);

    return () => window.removeEventListener("message", handleMainMessage);
  }, []);
}
