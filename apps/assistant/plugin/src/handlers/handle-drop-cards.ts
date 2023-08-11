import type { MessageToFigma } from "@h20/assistant-types";
import { loadFonts, replaceNotification } from "@h20/figma-tools";
import { startLayoutDraftFrame } from "../utils/layout";
import type { LayoutDraft } from "../widget/use-layout-draft";

const VERTICAL_GAP = 32;

export async function handleDropCards(message: MessageToFigma, currentNodeId: string, widgetManifestId: string) {
  if (!message.createCards) return;

  const summary = message.createCards;
  const { figmaDropContext, webDragContext } = summary;

  const cloneFromNode = getCloneFromNode(currentNodeId, widgetManifestId);
  if (!cloneFromNode) {
    replaceNotification("Widget no longer exists", { error: true });
    return;
  }

  await loadFonts({ family: "Inter", style: "Medium" }, { family: "Inter", style: "Semi Bold" });

  const frame = startLayoutDraftFrame({ layoutMode: "VERTICAL", itemSpacing: VERTICAL_GAP });
  frame.x = figmaDropContext?.x ?? cloneFromNode.x;
  frame.y = figmaDropContext?.y ?? cloneFromNode.y;

  const parentNode = figmaDropContext ? figma.getNodeById(figmaDropContext.parentNodeId) : figma.currentPage;
  if (!Array.isArray((parentNode as ChildrenMixin)?.children)) {
    replaceNotification("This container cannot be used for dropping", { error: true });
    return;
  }

  (parentNode as ChildrenMixin).appendChild(frame);

  summary.cards.forEach((card, index) => {
    const clonedWidget = cloneFromNode.cloneWidget({ cardData: card });
    frame.appendChild(clonedWidget);

    // the last card will be annotated with layout draft for the entire frame
    if (index === summary.cards.length - 1) {
      const layoutDraft: LayoutDraft = webDragContext
        ? {
            xOffsetPercent: -(webDragContext.offsetX / webDragContext.nodeWidth),
            yOffsetPercent: -(webDragContext.offsetY / webDragContext.nodeHeight),
          }
        : {
            // without drag context, we use last card as a reference and center align with it
            xOffsetPercent: -0.5,
            yOffsetPercent: 0,
            xOffset: clonedWidget.width / 2,
            yOffset: cloneFromNode.height + VERTICAL_GAP,
          };

      clonedWidget.setWidgetSyncedState({
        cardData: card,
        layoutDraft,
      });
    }

    if (!figmaDropContext) {
      replaceNotification(`✅ Card added to canvas`, {
        button: {
          text: "Locate it",
          action: () => figma.viewport.scrollAndZoomIntoView([clonedWidget]),
        },
      });
    }
  });
}

function getCloneFromNode(currentNodeId: string, widgetManifestId: string): WidgetNode | null {
  let cloneFromNode = figma.getNodeById(currentNodeId) as WidgetNode | null;

  if (!cloneFromNode) {
    cloneFromNode = figma.currentPage
      .findAllWithCriteria({ types: ["WIDGET"] })
      .filter((node) => node.widgetId === widgetManifestId)
      .pop() as WidgetNode;
  }

  return cloneFromNode;
}
