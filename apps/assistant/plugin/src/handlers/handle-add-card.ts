import type { MessageToFigma } from "@h20/assistant-types";
import { loadFonts, replaceNotification } from "@h20/figma-tools";

export async function handleAddCard(message: MessageToFigma, currentNodeId: string, widgetManifestId: string) {
  if (!message.addCard) return;

  await loadFonts({ family: "Inter", style: "Medium" }, { family: "Inter", style: "Semi Bold" });

  let cloneFromNode = figma.getNodeById(currentNodeId) as WidgetNode;

  if (!cloneFromNode) {
    cloneFromNode = figma.currentPage
      .findAllWithCriteria({ types: ["WIDGET"] })
      .filter((node) => node.widgetId === widgetManifestId)
      .pop() as WidgetNode;

    if (!cloneFromNode) {
      replaceNotification("Widget no longer exists", { error: true });
    }
  }

  const clonedWidget = cloneFromNode.cloneWidget({ cardData: message.addCard });

  clonedWidget.x = cloneFromNode.x;
  clonedWidget.y = cloneFromNode.y + cloneFromNode.height + 32;
  figma.currentPage.appendChild(clonedWidget);

  replaceNotification(`✅ Card added to canvas`, {
    button: {
      text: "Locate it",
      action: () => figma.viewport.scrollAndZoomIntoView([clonedWidget]),
    },
  });
}
