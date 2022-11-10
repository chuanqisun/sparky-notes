import { CardData, MessageToMain, MessageToUI } from "@h20/types";
import BadgeLightSvg from "./assets/BadgeLight.svg";
import figmaPalette from "./assets/figma-palette.json";

const { widget } = figma;
const { useEffect, AutoLayout, useSyncedState, usePropertyMenu, useWidgetId, SVG, Text } = widget;

const showUI = (search: string = "") =>
  figma.showUI(`<script>window.location.href="${process.env.WEB_URL + search}"</script>`, {
    height: 800,
    width: 420,
  });

const sendToUI = (message: MessageToUI) => {
  figma.ui.postMessage(message);
};

function Widget() {
  const widgetId = useWidgetId();

  const [cardData, _setCardData] = useSyncedState<CardData | null>("cardData", null);
  const [cardBackground, setCardBackground] = useSyncedState("cardBackground", figmaPalette[0].option);

  usePropertyMenu(
    cardData
      ? [
          {
            itemType: "color-selector",
            propertyName: "backgroundColor",
            tooltip: "Background",
            selectedOption: cardBackground,
            options: figmaPalette,
          },
        ]
      : [],
    ({ propertyName, propertyValue }) => {
      switch (propertyName) {
        case "backgroundColor":
          setCardBackground(propertyValue!);
          break;
      }
    }
  );

  useEffect(() => {
    figma.ui.onmessage = async (msg: MessageToMain) => {
      console.log(msg);

      if (msg.importResult) {
        if (msg.importResult.isSuccess) {
          figma.notify("Importing... Success");
        } else if (msg.importResult.isError) {
          figma.notify("Importing... Failed", { error: true });
        } else if (msg.importResult.isInProgress) {
          figma.notify("Importing...");
        }
      }

      if (msg.addCard) {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });

        const widgetNode = figma.getNodeById(widgetId) as WidgetNode;

        const clonedWidget = widgetNode.cloneWidget({
          cardData: msg.addCard,
          cardBackground: msg.addCard.backgroundColor,
        });

        clonedWidget.x = figma.viewport.center.x - clonedWidget.width / 2 + 32;
        clonedWidget.y = figma.viewport.center.y - clonedWidget.height / 2 + 32;
        figma.currentPage.appendChild(clonedWidget);

        figma.viewport.scrollAndZoomIntoView([clonedWidget]);

        figma.notify(`✅ Card added to canvas`);
      }

      if (msg.requestClose) {
        figma.closePlugin();
      }
    };
  });

  return cardData === null ? (
    <SVG src={BadgeLightSvg} width={436} height={436} onClick={() => new Promise((resolve) => showUI())} />
  ) : (
    <AutoLayout padding={24} direction="vertical" fill={cardBackground} cornerRadius={6} spacing={16}>
      <AutoLayout>
        <Text width={400} fontSize={24} lineHeight={28} fontWeight={700}>
          {cardData.category}
        </Text>
      </AutoLayout>
      <AutoLayout
        onClick={() =>
          new Promise((_resolve) => {
            showUI(`?openUrl=${cardData.url}`);
          })
        }
      >
        <Text width={400} fontSize={24} lineHeight={28}>
          {cardData.title}
        </Text>
      </AutoLayout>
    </AutoLayout>
  );
}

widget.register(Widget);
