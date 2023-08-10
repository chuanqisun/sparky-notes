import type { MessageToFigma } from "@h20/assistant-types";
import { loadFonts, replaceNotification } from "@h20/figma-tools";

export async function handleDropCards(message: MessageToFigma, currentNodeId: string, widgetManifestId: string) {
  if (!message.dropCards) return;

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

  // currently only support one card
  const clonedWidget = cloneFromNode.cloneWidget({ cardData: message.dropCards.cards[0] });
  const parentNode = figma.getNodeById(message.dropCards.dropEvent.node.id);

  if (Array.isArray((parentNode as ChildrenMixin)?.children)) {
    (parentNode as ChildrenMixin).appendChild(clonedWidget);
    clonedWidget.x = message.dropCards.dropEvent.x;
    clonedWidget.y = message.dropCards.dropEvent.y;
  } else {
    figma.currentPage.appendChild(clonedWidget);
    clonedWidget.x = cloneFromNode.x;
    clonedWidget.y = cloneFromNode.y + cloneFromNode.height + 32;
  }

  replaceNotification(`✅ Card added to canvas`, {
    button: {
      text: "Locate it",
      action: () => figma.viewport.scrollAndZoomIntoView([clonedWidget]),
    },
  });
}
