import type { MessageToWeb } from "@h20/assistant-types";

export function handleMarkCardAsAdded(message: MessageToWeb, trackVisitedId: (...ids: string[]) => void) {
  if (!message.addedCards) return;

  trackVisitedId(...message.addedCards.cards.map((card) => card.entityId));
}
