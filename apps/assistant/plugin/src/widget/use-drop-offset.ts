import type { CardData } from "@h20/assistant-types";

const { useEffect, useSyncedState } = figma.widget;

export function useDropOffset(cardData: null | CardData, widgetId: string) {
  const [pendingOffset, setPendingOffset] = useSyncedState<null | { xPercent: number; yPercent: number }>("pendingOffset", null);

  useEffect(() => {
    if (cardData && pendingOffset) {
      const widgetNode = figma.getNodeById(widgetId) as WidgetNode;
      if (!widgetNode) return;

      console.log(pendingOffset);

      widgetNode.x += widgetNode.width * pendingOffset.xPercent;
      widgetNode.y += widgetNode.height * pendingOffset.yPercent;

      setPendingOffset(null);
    }
  });
}
