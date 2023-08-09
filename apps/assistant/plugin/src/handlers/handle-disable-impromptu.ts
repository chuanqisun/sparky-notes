import type { MessageToFigma } from "@h20/assistant-types";

export async function handleDisableImpromptu(message: MessageToFigma, disableImpromptu: () => void, openIndexPage: () => void) {
  if (!message.disableImpromptu) return;

  disableImpromptu();
  openIndexPage();
}
