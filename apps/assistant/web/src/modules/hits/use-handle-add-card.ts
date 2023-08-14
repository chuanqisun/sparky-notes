import type { CardData, MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import type { ApplicationInsights } from "@microsoft/applicationinsights-web";
import { useCallback } from "preact/hooks";

export function useHandleAddCards(appInsights: ApplicationInsights, proxyToFigma: ProxyToFigma<MessageToFigma, MessageToWeb>) {
  const handleAddCards = useCallback((cardData: CardData[]) => {
    appInsights.trackEvent({ name: "add-card" }, { gesture: "click" });
    proxyToFigma.notify({ addCards: { cards: cardData } });
  }, []);

  return handleAddCards;
}
