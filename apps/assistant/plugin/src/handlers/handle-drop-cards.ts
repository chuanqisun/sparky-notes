import type { MessageToFigma } from "@h20/assistant-types";
import { loadFonts, replaceNotification } from "@h20/figma-tools";
import { startLayoutDraftFrame } from "../utils/layout";
import type { LayoutDraft } from "../widget/use-layout-draft";

export async function handleDropCards(message: MessageToFigma, currentNodeId: string, widgetManifestId: string) {
  if (!message.createCards) return;

  const summary = message.createCards;
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

  if (!figmaDropContext) {
    const primaryCard = summary.cards[0]!;
    const clonedWidget = cloneFromNode.cloneWidget({ cardData: primaryCard });
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
  if (!Array.isArray((parentNode as ChildrenMixin)?.children)) return;

  const frame = startLayoutDraftFrame({ layoutMode: "VERTICAL", itemSpacing: 32 });

  (parentNode as ChildrenMixin).appendChild(frame);

  frame.x = figmaDropContext.x;
  frame.y = figmaDropContext.y;

  summary.cards.forEach((card, index) => {
    const clonedWidget = cloneFromNode.cloneWidget({ cardData: card });
    frame.appendChild(clonedWidget);

    if (index === summary.cards.length - 1) {
      const layoutDraft: LayoutDraft = webDragContext
        ? {
            xOffsetPercent: -(webDragContext.offsetX / webDragContext.nodeWidth),
            yOffsetPercent: -(webDragContext.offsetY / webDragContext.nodeHeight),
          }
        : {};

      clonedWidget.setWidgetSyncedState({
        cardData: card,
        layoutDraft,
      });
    }
  });
}
