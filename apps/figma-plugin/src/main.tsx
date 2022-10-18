import { MessageToMain, MessageToUI } from "@h20/types";
import BadgeLightSvg from "./assets/BadgeLight.svg";
const { widget } = figma;
const { useEffect, AutoLayout, useSyncedState, useWidgetId, SVG, Text } = widget;

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

  return (
    <AutoLayout>
      {cardData === null ? (
        <SVG src={BadgeLightSvg} width={756} height={756} onClick={() => new Promise((resolve) => showUI())} />
      ) : (
        <AutoLayout
          padding={24}
          fill="#fff"
          stroke="#000"
          strokeWidth={2}
          cornerRadius={12}
          onClick={() =>
            new Promise((resolve) => {
              showUI(`?openUrl=${cardData.url}`);
            })
          }
        >
          <Text width={400}>{cardData.title}</Text>
        </AutoLayout>
      )}
    </AutoLayout>
  );
}

widget.register(Widget);
