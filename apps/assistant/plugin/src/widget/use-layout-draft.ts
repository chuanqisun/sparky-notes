import type { CardData } from "@h20/assistant-types";
import { finishLayoutDraftFrame } from "../utils/layout";

const { useEffect, useSyncedState } = figma.widget;

export interface LayoutDraft {
  xOffsetPercent?: number;
  yOffsetPercent?: number;
  xOffset?: number;
  yOffset?: number;
}

export function useLayoutDraft(cardData: null | CardData, widgetId: string) {
  const [layoutDraft, sesLayoutDraft] = useSyncedState<null | LayoutDraft>("layoutDraft", null);

  useEffect(() => {
    if (cardData && layoutDraft) {
      const widgetNode = figma.getNodeById(widgetId) as WidgetNode;
      if (!widgetNode) return;

      console.log(layoutDraft);

      const parentFrame = widgetNode.parent as FrameNode;
      if (parentFrame?.type !== "FRAME") return;

      parentFrame.x += widgetNode.width * (layoutDraft.xOffsetPercent ?? 0) + (layoutDraft.xOffset ?? 0);
      parentFrame.y += widgetNode.height * (layoutDraft.yOffsetPercent ?? 0) + (layoutDraft.yOffset ?? 0);

      finishLayoutDraftFrame(parentFrame);

      sesLayoutDraft(null);
    }
  });
}
