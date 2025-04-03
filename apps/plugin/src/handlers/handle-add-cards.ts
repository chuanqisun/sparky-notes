import type { MessageToFigma, MessageToWeb } from "@sticky-plus/figma-ipc-types";
import { loadFonts, replaceNotification, type ProxyToWeb } from "@sticky-plus/figma-tools";
import { startLayoutDraftFrame } from "../utils/layout";
import type { LayoutDraft } from "../widget/use-layout-draft";

const VERTICAL_GAP = 32;

export async function handleAddCards(
  message: MessageToFigma,
  proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>,
  currentNodeId: string,
  widgetManifestId: string
) {
  if (!message.addCards) return;

  const summary = message.addCards;
  const { figmaDropContext, webDragContext } = summary;

  const cloneFromNode = await getCloneFromNode(currentNodeId, widgetManifestId);
  if (!cloneFromNode) {
    replaceNotification("Widget no longer exists", { error: true });
    return;
  }

  await loadFonts({ family: "Inter", style: "Medium" }, { family: "Inter", style: "Semi Bold" });

  const frame = startLayoutDraftFrame({ layoutMode: "VERTICAL", itemSpacing: VERTICAL_GAP });
  frame.x = figmaDropContext?.x ?? cloneFromNode.x;
  frame.y = figmaDropContext?.y ?? cloneFromNode.y;

  const parentNode = figmaDropContext ? await figma.getNodeByIdAsync(figmaDropContext.parentNodeId) : figma.currentPage;
  if (!Array.isArray((parentNode as ChildrenMixin)?.children)) {
    replaceNotification("This container cannot be used for dropping", { error: true });
    return;
  }

  (parentNode as ChildrenMixin).appendChild(frame);

  const addedNodes: SceneNode[] = [];
  summary.cards.forEach((card, index) => {
    const clonedWidget = cloneFromNode.cloneWidget({ cardData: card });
    frame.appendChild(clonedWidget);
    addedNodes.push(clonedWidget);

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
      figma.currentPage.selection = [...addedNodes];

      replaceNotification(`✅ Card added to canvas`, {
        button: {
          text: "Locate it",
          action: () => figma.viewport.scrollAndZoomIntoView([...addedNodes]),
        },
      });
    }
  });

  proxyToWeb.notify({ addedCards: summary });
}

async function getCloneFromNode(currentNodeId: string, widgetManifestId: string): Promise<WidgetNode | null> {
  let cloneFromNode = (await figma.getNodeByIdAsync(currentNodeId)) as WidgetNode | null;

  if (!cloneFromNode) {
    cloneFromNode = figma.currentPage
      .findAllWithCriteria({ types: ["WIDGET"] })
      .filter((node) => node.widgetId === widgetManifestId)
      .pop() as WidgetNode;
  }

  return cloneFromNode;
}
