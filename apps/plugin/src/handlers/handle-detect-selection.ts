import type { MessageToFigma } from "@sticky-plus/figma-ipc-types";

export async function handleDetectSelection(message: MessageToFigma, notifySelectionChange: () => void) {
  if (!message.detectSelection) return;

  notifySelectionChange();
}
