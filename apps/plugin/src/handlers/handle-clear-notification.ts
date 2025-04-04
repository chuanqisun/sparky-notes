import type { MessageToFigma } from "@sparky-notes/figma-ipc-types";
import { clearNotification } from "@sparky-notes/figma-tools";

export async function handleClearNotification(message: MessageToFigma) {
  if (!message.clearNotification) return;

  clearNotification();
}
