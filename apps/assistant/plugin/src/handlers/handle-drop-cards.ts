import type { DropCardSummary } from "@h20/assistant-types";
import { loadFonts, replaceNotification } from "@h20/figma-tools";

export async function handleDropCards(summary: DropCardSummary, event: DropEvent, currentNodeId: string, widgetManifestId: string) {
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
  const parentNode = figma.getNodeById(event.node.id);

  if (Array.isArray((parentNode as ChildrenMixin)?.children)) {
    (parentNode as ChildrenMixin).appendChild(clonedWidget);
    clonedWidget.x = event.x;
    clonedWidget.y = event.y;

    clonedWidget.setWidgetSyncedState({
      cardData: summary.data,
      pendingNudge: {
        xPercent: -(summary.dragEvent.offsetX / summary.dragEvent.nodeWidth),
        yPercent: -(summary.dragEvent.offsetY / summary.dragEvent.nodeHeight),
      },
    });
  } else {
    figma.currentPage.appendChild(clonedWidget);
    clonedWidget.x = cloneFromNode.x;
    clonedWidget.y = cloneFromNode.y + cloneFromNode.height + 32;
  }
}
