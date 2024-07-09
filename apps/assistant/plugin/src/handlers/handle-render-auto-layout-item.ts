import type { MessageToFigma } from "@h20/assistant-types";

export async function handleRenderAutoLayoutItem(message: MessageToFigma) {
  if (!message.renderAutoLayoutItem) return;

  await figma.currentPage.loadAsync();
  const container = await figma.currentPage.findOne((n) => n.name === message.renderAutoLayoutItem!.containerName);

  if (!container) {
    figma.notify("Container not found", { error: true });
    return;
  }

  if (message.renderAutoLayoutItem.clear) {
    (container as ComponentNode).children?.forEach((child) => {
      child.remove();
    });
  }

  console.log(container?.id);
}
