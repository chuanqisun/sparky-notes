import type { MessageToFigma } from "@h20/assistant-types";
import { clearNotification } from "@h20/figma-tools";

export async function handleClearNotification(message: MessageToFigma) {
  if (!message.clearNotification) return;

  clearNotification();
}
