import { CardData, MessageToMain, MessageToUI } from "@h20/types";
import BadgeLightSvg from "./assets/BadgeLight.svg";
import figmaPalette from "./assets/figma-palette.json";
import Plus from "./assets/FigmaPlus.svg";

const { widget } = figma;
const { useEffect, AutoLayout, useSyncedState, usePropertyMenu, useWidgetId, SVG, Text, Input } = widget;

const appendCacheBustingString = (url: string) => (url + url.includes("?") ? `&` : `?` + `t=${Date.now()}`);

const showUI = (urlSuffix: string = "") =>
  figma.showUI(`<script>window.location.href="${process.env.WEB_URL + appendCacheBustingString(urlSuffix)}"</script>`, {
    height: 800,
    width: 420,
  });

const sendToUI = (message: MessageToUI) => {
  figma.ui.postMessage(message);
};

function Widget() {
  const widgetId = useWidgetId();

  const [cardData, setCardData] = useSyncedState<CardData | null>("cardData", null);
  const [cardBackground, setCardBackground] = useSyncedState("cardBackground", figmaPalette[0].option);

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
            selectedOption: cardBackground,
            options: figmaPalette,
          },
          {
            itemType: "separator",
          },
          {
            itemType: "action",
            propertyName: "openInBrowser",
            tooltip: "Open in browser",
          },
        ]
      : [],
    ({ propertyName, propertyValue }) => {
      switch (propertyName) {
        case "backgroundColor":
          setCardData({ ...cardData!, backgroundColor: propertyValue! });
          break;
        case "add":
          return new Promise((_resolve) => showUI());
        case "openInBrowser":
          return new Promise((_resolve) => {
            showUI(`?openUrl=${cardData!.url}`);
          });
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

  const setCategory = (e: TextEditEvent) => setCardData((prevData) => ({ ...prevData!, category: e.characters }));

  return cardData === null ? (
    <SVG src={BadgeLightSvg} width={436} height={436} onClick={() => new Promise((resolve) => showUI())} />
  ) : (
    <AutoLayout padding={0} direction="vertical" fill={cardData.backgroundColor} cornerRadius={6}>
      <AutoLayout padding={cssPad(24, 24, 8, 24)}>
        <Input value={cardData.category} width={400} fontSize={24} lineHeight={28} fontWeight={700} onTextEditEnd={setCategory} />
      </AutoLayout>
      <AutoLayout
        padding={cssPad(8, 24, 24, 24)}
        onClick={() =>
          new Promise((_resolve) => {
            showUI(`/card.html?entityId=${cardData.entityId}&entityType=${cardData.entityType}`);
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

function cssPad(top: number, right: number, bottom: number, left: number) {
  return {
    top,
    right,
    bottom,
    left,
  };
}
