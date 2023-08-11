import type { CreateCardSummary, MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { cssPadding, getProxyToWeb, type ProxyToWeb } from "@h20/figma-tools";
import BadgeDarkSvg from "./assets/BadgeDark.svg";
import BadgeLightSvg from "./assets/BadgeLight.svg";
import { handleAddCard } from "./handlers/handle-add-card";
import { handleDisableCopilot } from "./handlers/handle-disable-copilot";
import { handleDropCards } from "./handlers/handle-drop-cards";
import { handleDropLinks } from "./handlers/handle-drop-links";
import { handleEnableCopilot } from "./handlers/handle-enable-copilot";
import { handleSelectionChange } from "./handlers/handle-selection-change";
import { openCardPage, openCopilotPage, openIndexPage } from "./router/router";
import { getFigmaDropContext } from "./utils/drag-and-drop";
import { useWidgetState } from "./widget/use-card";
import { useCopilotSwitch } from "./widget/use-copilot-switch";
import { useDropOffset } from "./widget/use-drop-offset";

const { widget } = figma;
const { useEffect, AutoLayout, useWidgetId, SVG, Text } = widget;

const proxyToWeb = getProxyToWeb<MessageToWeb, MessageToFigma>();

function Widget() {
  const widgetId = useWidgetId();

  const { cardData } = useWidgetState({ openIndexPage });
  const { isCopilotEnabled, enableCopilot, disableCopilot } = useCopilotSwitch();

  useDropOffset(cardData, widgetId);

  useEffect(() => {
    const wrappedHandleSelectionChange = () => {
      handleSelectionChange(proxyToWeb);
    };

    const wrappedHandleDrop = (event: DropEvent) => {
      console.log(event);
      // TOO refactor into add card
      const card = event.items
        .filter((item) => item.type === "application/x.hits.drop-card")
        .map((item) => JSON.parse(item.data) as CreateCardSummary)
        .pop();

      if (card) {
        // Forward as message to itself
        handleMessageFromWeb({
          createCard: {
            ...card,
            figmaDropContext: getFigmaDropContext(event),
          },
        });
      }

      handleDropLinks(event, proxyToWeb);

      return false;
    };

    const handleMessageFromWeb = async (message: MessageToFigma) => {
      console.log(message);

      handleAddCard(message, widgetId, process.env.VITE_WIDGET_MANIFEST_ID);
      handleEnableCopilot(message, enableCopilot, openCopilotPage);
      handleDisableCopilot(message, disableCopilot, openIndexPage);
      handleDropCards(message, widgetId, process.env.VITE_WIDGET_MANIFEST_ID);
    };

    figma.ui.onmessage = handleMessageFromWeb;

    figma.on("selectionchange", wrappedHandleSelectionChange);
    figma.on("drop", wrappedHandleDrop);

    return () => {
      figma.off("selectionchange", wrappedHandleSelectionChange);
      figma.off("drop", wrappedHandleDrop);
    };
  });

  return cardData === null ? (
    <SVG
      src={isCopilotEnabled ? BadgeDarkSvg : BadgeLightSvg}
      width={436}
      height={436}
      onClick={() => new Promise((_resolve) => (isCopilotEnabled ? openCopilotPage() : openIndexPage()))}
    />
  ) : (
    <AutoLayout
      padding={0}
      direction="vertical"
      fill={cardData.backgroundColor}
      cornerRadius={6}
      strokeWidth={4}
      onClick={() => new Promise((_resolve) => openCardPage(cardData.entityId, cardData.entityType))}
    >
      <AutoLayout padding={cssPadding(20, 24, 6, 24)}>
        <Text width={500} fontSize={20} fontWeight={600} lineHeight={26}>
          {cardData.title}
        </Text>
      </AutoLayout>
      <AutoLayout padding={cssPadding(4, 24, 20, 24)}>
        <Text opacity={0.7} width={500} fontSize={18} lineHeight={20} href={cardData!.url}>
          {cardData!.url.replace("https://", "")}
        </Text>
      </AutoLayout>
    </AutoLayout>
  );
}

widget.register(Widget);

export interface HandlerContext {
  message: MessageToFigma;
  widgetId: string;
  webProxy: ProxyToWeb<MessageToWeb, MessageToFigma>;
}
