import type { MessageToFigma } from "@h20/assistant-types";
import { replaceNotification } from "@h20/figma-tools";

export async function handleShowNotification(message: MessageToFigma) {
  if (!message.showNotification) return;

  replaceNotification(message.showNotification.message, message.showNotification.config);
}
