import { CardData, MessageToMain, MessageToUI } from "@h20/assistant-types";
import BadgeLightSvg from "./assets/BadgeLight.svg";
import Plus from "./assets/FigmaPlus.svg";
import figmaPalette from "./assets/figma-palette.json";
import { showUI } from "./utils/show-ui";

const { widget } = figma;
const { useEffect, AutoLayout, useSyncedState, usePropertyMenu, useWidgetId, SVG, Text, Input } = widget;

const openIndexPage = () => showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 800, width: 420 });
const openCardPage = (entityId: number | string, entityType: number | string) =>
  showUI(`${process.env.VITE_WEB_HOST}/card.html?entityId=${entityId}&entityType=${entityType}`, { height: 800, width: 420 });

const sendToUI = (message: MessageToUI) => {
  figma.ui.postMessage(message);
};

function Widget() {
  const widgetId = useWidgetId();

  const [cardData, setCardData] = useSyncedState<CardData | null>("cardData", null);

  usePropertyMenu(
    cardData
      ? [
          {
            icon: Plus,
            itemType: "action",
            propertyName: "add",
            tooltip: "New",
          },
          {
            itemType: "separator",
          },
          {
            itemType: "color-selector",
            propertyName: "backgroundColor",
            tooltip: "Background",
            selectedOption: cardData.backgroundColor,
            options: figmaPalette,
          },
        ]
      : [],
    ({ propertyName, propertyValue }) => {
      switch (propertyName) {
        case "backgroundColor":
          setCardData({ ...cardData!, backgroundColor: propertyValue! });
          break;
        case "add":
          return new Promise((_resolve) => openIndexPage());
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
        const clonedWidget = widgetNode.cloneWidget({ cardData: msg.addCard });

        clonedWidget.x = widgetNode.x;
        clonedWidget.y = widgetNode.y + widgetNode.height + 32;
        figma.currentPage.appendChild(clonedWidget);

        figma.notify(`✅ Card added to canvas`);
      }

      if (msg.requestClose) {
        figma.closePlugin();
      }
    };
  });

  return cardData === null ? (
    <SVG src={BadgeLightSvg} width={436} height={436} onClick={() => new Promise((_resolve) => openIndexPage())} />
  ) : (
    <AutoLayout
      padding={0}
      direction="vertical"
      fill={cardData.backgroundColor}
      cornerRadius={6}
      strokeWidth={4}
      onClick={() => new Promise((_resolve) => openCardPage(cardData.entityId, cardData.entityType))}
    >
      <AutoLayout padding={cssPad(20, 24, 6, 24)}>
        <Text width={500} fontSize={20} fontWeight={600} lineHeight={26}>
          {cardData.title}
        </Text>
      </AutoLayout>
      <AutoLayout padding={cssPad(4, 24, 20, 24)}>
        <Text opacity={0.7} width={500} fontSize={18} lineHeight={20} href={cardData!.url}>
          {cardData!.url.replace("https://", "")}
        </Text>
      </AutoLayout>
    </AutoLayout>
  );
}

widget.register(Widget);

function cssPad(top: number, right: number, bottom: number, left: number) {
  return {
    top,
    right,
    bottom,
    left,
  };
}
