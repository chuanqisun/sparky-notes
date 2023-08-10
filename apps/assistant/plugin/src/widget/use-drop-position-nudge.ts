import type { CardData } from "@h20/assistant-types";

const { useEffect, useSyncedState } = figma.widget;

export function useDropPositionNudge(cardData: null | CardData, widgetId: string) {
  const [pendingNudge, setPendingNudge] = useSyncedState<null | { xPercent: number; yPercent: number }>("pendingNudge", null);

  useEffect(() => {
    if (cardData && pendingNudge) {
      const widgetNode = figma.getNodeById(widgetId) as WidgetNode;
      if (!widgetNode) return;

      console.log(pendingNudge);

      widgetNode.x += widgetNode.width * pendingNudge.xPercent;
      widgetNode.y += widgetNode.height * pendingNudge.yPercent;

      setPendingNudge(null);
    }
  });
}
