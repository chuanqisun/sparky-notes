import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { cssPadding, getProxyToWeb, type ProxyToWeb } from "@h20/figma-tools";
import BadgeDarkSvg from "./assets/BadgeDark.svg";
import BadgeLightSvg from "./assets/BadgeLight.svg";
import { handleAddCard } from "./handlers/handle-add-card";
import { handleDisableCopilot } from "./handlers/handle-disable-copilot";
import { handleEnableCopilot } from "./handlers/handle-enable-copilot";
import { handleSelectionChange } from "./handlers/handle-selection-change";
import { openCardPage, openCopilotPage, openIndexPage } from "./router/router";
import { useWidgetState } from "./widget/use-card";
import { useCopilotSwitch } from "./widget/use-copilot-switch";

const { widget } = figma;
const { useEffect, AutoLayout, useWidgetId, SVG, Text } = widget;

const proxyToWeb = getProxyToWeb<MessageToWeb, MessageToFigma>();

function Widget() {
  const widgetId = useWidgetId();

  const { cardData } = useWidgetState({ openIndexPage });
  const { isCopilotEnabled, enableCopilot, disableCopilot } = useCopilotSwitch();

  useEffect(() => {
    const convertSelectionChangeToMessage = () => {
      handleMessageFromWeb({ selectionChange: true });
    };

    const handleMessageFromWeb = async (message: MessageToFigma) => {
      console.log(message);

      handleSelectionChange(message, proxyToWeb);
      handleAddCard(message, widgetId, process.env.VITE_WIDGET_MANIFEST_ID);
      handleEnableCopilot(message, enableCopilot, openCopilotPage);
      handleDisableCopilot(message, disableCopilot, openIndexPage);
    };

    figma.ui.onmessage = handleMessageFromWeb;

    figma.on("selectionchange", convertSelectionChangeToMessage);

    return () => {
      figma.off("selectionchange", convertSelectionChangeToMessage);
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
