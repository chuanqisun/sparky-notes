import type { MessageToFigma } from "@h20/assistant-types";

export async function handleDisableCopilot(message: MessageToFigma, disableCopilot: () => void, openIndexPage: () => void) {
  if (!message.disableCopilot) return;

  disableCopilot();
  openIndexPage();
}
