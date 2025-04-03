import type { CardData } from "@sticky-plus/figma-ipc-types";
import { finishLayoutDraftFrame } from "../utils/layout";

const { useEffect, useSyncedState } = figma.widget;

export interface LayoutDraft {
  xOffsetPercent?: number;
  yOffsetPercent?: number;
  xOffset?: number;
  yOffset?: number;
}

export function useLayoutDraft(cardData: null | CardData, widgetId: string) {
  const [layoutDraft, setLayoutDraft] = useSyncedState<null | LayoutDraft>("layoutDraft", null);

  useEffect(() => {
    if (cardData && layoutDraft) {
      (figma.getNodeByIdAsync(widgetId) as Promise<WidgetNode | null>).then((widgetNode) => {
        if (!widgetNode) return;

        console.log(layoutDraft);

        const parentFrame = widgetNode.parent as FrameNode;
        if (parentFrame?.type !== "FRAME") return;

        parentFrame.x += widgetNode.width * (layoutDraft.xOffsetPercent ?? 0) + (layoutDraft.xOffset ?? 0);
        parentFrame.y += widgetNode.height * (layoutDraft.yOffsetPercent ?? 0) + (layoutDraft.yOffset ?? 0);

        finishLayoutDraftFrame(parentFrame);

        setLayoutDraft(null);
      });
    }
  });
}
