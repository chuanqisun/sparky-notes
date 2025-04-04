import type { MessageToFigma } from "@sparky-notes/figma-ipc-types";

export async function handleDetectSelection(message: MessageToFigma, notifySelectionChange: () => void) {
  if (!message.detectSelection) return;

  notifySelectionChange();
}
