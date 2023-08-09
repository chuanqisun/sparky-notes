import type { MessageToFigma } from "@h20/assistant-types";

export async function handleEnableImpromptu(message: MessageToFigma, enableImpromptu: () => void, openImpromptu: () => void) {
  if (!message.enableImpromptu) return;

  enableImpromptu();
  openImpromptu();
}
