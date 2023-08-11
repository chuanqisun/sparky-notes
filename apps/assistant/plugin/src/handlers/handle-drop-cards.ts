import type { MessageToFigma } from "@h20/assistant-types";
import { loadFonts, replaceNotification } from "@h20/figma-tools";

export async function handleDropCards(message: MessageToFigma, currentNodeId: string, widgetManifestId: string) {
  if (!message.createCard) return;

  console.log("drop card", message);

  const summary = message.createCard;
  const { figmaDropContext, webDragContext } = summary;

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

  const clonedWidget = cloneFromNode.cloneWidget({ cardData: summary.data });

  if (!figmaDropContext) {
    replaceNotification(`✅ Card added to canvas`, {
      button: {
        text: "Locate it",
        action: () => figma.viewport.scrollAndZoomIntoView([clonedWidget]),
      },
    });

    figma.currentPage.appendChild(clonedWidget);
    clonedWidget.x = cloneFromNode.x;
    clonedWidget.y = cloneFromNode.y + cloneFromNode.height + 32;
    return;
  }

  const parentNode = figma.getNodeById(figmaDropContext.parentNodeId);
  if (Array.isArray((parentNode as ChildrenMixin)?.children)) {
    (parentNode as ChildrenMixin).appendChild(clonedWidget);
    clonedWidget.x = figmaDropContext.x;
    clonedWidget.y = figmaDropContext.y;

    if (webDragContext) {
      clonedWidget.setWidgetSyncedState({
        cardData: summary.data,
        pendingOffset: {
          xPercent: -(webDragContext.offsetX / webDragContext.nodeWidth),
          yPercent: -(webDragContext.offsetY / webDragContext.nodeHeight),
        },
      });
    }
  }
}
