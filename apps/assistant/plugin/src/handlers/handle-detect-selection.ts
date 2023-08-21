import type { MessageToFigma } from "@h20/assistant-types";

export async function handleDetectSelection(message: MessageToFigma, notifySelectionChange: () => void) {
  if (!message.detectSelection) return;

  notifySelectionChange();
}
