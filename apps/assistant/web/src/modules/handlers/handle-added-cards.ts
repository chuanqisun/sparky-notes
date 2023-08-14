import type { MessageToWeb } from "@h20/assistant-types";
import type { ApplicationInsights } from "@microsoft/applicationinsights-web";

export function handleAddedCards(message: MessageToWeb, appInsights: ApplicationInsights) {
  if (!message.addedCards) return;

  appInsights.trackEvent({ name: "added-cards" }, { addedCards: message.addedCards });
}
