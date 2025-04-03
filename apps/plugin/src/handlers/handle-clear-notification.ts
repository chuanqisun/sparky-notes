import type { MessageToFigma } from "@sticky-plus/figma-ipc-types";
import { clearNotification } from "@sticky-plus/figma-tools";

export async function handleClearNotification(message: MessageToFigma) {
  if (!message.clearNotification) return;

  clearNotification();
}
