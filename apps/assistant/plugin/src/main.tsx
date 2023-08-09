import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { cssPadding, getProxyToWeb, type ProxyToWeb } from "@h20/figma-tools";
import BadgeDarkSvg from "./assets/BadgeDark.svg";
import BadgeLightSvg from "./assets/BadgeLight.svg";
import { handleAddCard } from "./handlers/handle-add-card";
import { handleEnableImpromptu } from "./handlers/handle-enable-impromptu";
import { openCardPage, openImpromptuPage, openIndexPage } from "./router/router";
import { useWidgetState } from "./widget/use-card";
import { useImpromptuSwitch } from "./widget/use-impromptu-switch";

const { widget } = figma;
const { useEffect, AutoLayout, useWidgetId, SVG, Text } = widget;

const webProxy = getProxyToWeb<MessageToWeb, MessageToFigma>();

function Widget() {
  const widgetId = useWidgetId();

  const { cardData } = useWidgetState({ openIndexPage });
  const { isImpromptuEnabled, enableImpromptu } = useImpromptuSwitch();

  useEffect(() => {
    figma.ui.onmessage = async (message: MessageToFigma) => {
      console.log(message);

      handleAddCard(message, widgetId, process.env.VITE_WIDGET_MANIFEST_ID);
      handleEnableImpromptu(message, enableImpromptu, openImpromptuPage);
    };
  });

  return cardData === null ? (
    <SVG
      src={isImpromptuEnabled ? BadgeDarkSvg : BadgeLightSvg}
      width={436}
      height={436}
      onClick={() => new Promise((_resolve) => (isImpromptuEnabled ? openImpromptuPage() : openIndexPage()))}
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
