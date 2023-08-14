import type { CardData, MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import { useCallback } from "preact/hooks";

export function useHandleAddCards(proxyToFigma: ProxyToFigma<MessageToFigma, MessageToWeb>) {
  const handleAddCards = useCallback((cardData: CardData[]) => {
    proxyToFigma.notify({ addCards: { cards: cardData } });
  }, []);

  return handleAddCards;
}
