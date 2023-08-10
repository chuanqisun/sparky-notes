import type { MessageToFigma } from "@h20/assistant-types";

export async function handleEnableCopilot(message: MessageToFigma, enableCopilot: () => void, openCopilot: () => void) {
  if (!message.enableCopilot) return;

  enableCopilot();
  openCopilot();
}
