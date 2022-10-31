import { MessageToMain, MessageToUI } from "@h20/types";
import BadgeLightSvg from "./assets/BadgeLight.svg";
import documentIconUrl from "./assets/Document.svg";
import lightbulbIconUrl from "./assets/Lightbulb.svg";
import thumbupIconUrl from "./assets/Thumbup.svg";

const { widget } = figma;
const { useEffect, AutoLayout, useSyncedState, useWidgetId, SVG, Text } = widget;
const entityIcons: Record<number, string> = {
  1: lightbulbIconUrl,
  2: documentIconUrl,
  25: thumbupIconUrl,
  32: documentIconUrl,
  64: documentIconUrl,
};

// TODOs
// Generate card next to circle
// Insight inspector mode
// Native circle background and ring rendering
// Ring animation
// Hover state

const showUI = (search: string = "") =>
  figma.showUI(`<script>window.location.href="${process.env.WEB_URL + search}"</script>`, {
    height: 800,
    width: 420,
  });

const sendToUI = (message: MessageToUI) => {
  figma.ui.postMessage(message);
};

export interface CardData {
  title: string;
  entityType: number;
  url?: string;
}

function Widget() {
  const widgetId = useWidgetId();

  const [cardData, setCardData] = useSyncedState<CardData | null>("cardData", null);

  useEffect(() => {
    figma.ui.onmessage = async (msg: MessageToMain) => {
      console.log(msg);

      if (msg.importResult) {
        if (msg.importResult.isSuccess) {
          figma.notify("Import HITS Search success");
        } else {
          figma.notify("Import HITS Search failed", { error: true });
        }
      }

      if (msg.addCard) {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });

        const widgetNode = figma.getNodeById(widgetId) as WidgetNode;

        const clonedWidget = widgetNode.cloneWidget({
          cardData: msg.addCard,
        });

        clonedWidget.x = figma.viewport.center.x - clonedWidget.width / 2 + 32;
        clonedWidget.y = figma.viewport.center.y - clonedWidget.height / 2 + 32;
        figma.currentPage.appendChild(clonedWidget);

        figma.viewport.scrollAndZoomIntoView([clonedWidget]);

        figma.notify(`✅ Card added to canvas`);
      }
    };
  });

  return cardData === null ? (
    <SVG src={BadgeLightSvg} width={436} height={436} onClick={() => new Promise((resolve) => showUI())} />
  ) : (
    <AutoLayout
      padding={12}
      fill="#fff"
      stroke="#000"
      strokeWidth={2}
      cornerRadius={6}
      spacing={12}
      onClick={() =>
        new Promise((resolve) => {
          showUI(`?openUrl=${cardData.url}`);
        })
      }
    >
      <SVG src={entityIcons[cardData.entityType]} width={24} height={24} />
      <Text width={400} fontSize={24} lineHeight={28}>
        {cardData.title}
      </Text>
    </AutoLayout>
  );
}

widget.register(Widget);
