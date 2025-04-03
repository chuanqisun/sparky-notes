import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { cssPadding, getProxyToWeb, type ProxyToWeb } from "@h20/figma-tools";
import BadgeLightSvg from "./assets/BadgeLight.svg";
import { handleAddCards } from "./handlers/handle-add-cards";
import { handleClearNotification } from "./handlers/handle-clear-notification";
import { handleDetectSelection } from "./handlers/handle-detect-selection";
import { handleDropLinks } from "./handlers/handle-drop-links";
import { handleExportNode } from "./handlers/handle-export-node";
import { handleGetViewport } from "./handlers/handle-get-viewport";
import { handleMutation } from "./handlers/handle-mutation";
import { handleRenderAutoLayoutItem } from "./handlers/handle-render-auto-layout-item";
import { handleRenderObject } from "./handlers/handle-render-object";
import { handleSearchNodesByNamePattern } from "./handlers/handle-search-nodes-by-name-pattern";
import { handleSelectionChange } from "./handlers/handle-selection-change";
import { handleSetSelection } from "./handlers/handle-set-selection";
import { handleShowNotification } from "./handlers/handle-show-notification";
import { handleZoomIntoViewByNames } from "./handlers/handle-zoom-into-view-by-names";
import { openCardPage, openIndexPage } from "./router/router";
import { useWidgetState } from "./widget/use-card";
import { useLayoutDraft } from "./widget/use-layout-draft";

const { widget } = figma;
const { useEffect, AutoLayout, useWidgetNodeId, SVG, Text } = widget;

const proxyToWeb = getProxyToWeb<MessageToWeb, MessageToFigma>();

function Widget() {
  const widgetId = useWidgetNodeId();

  const { cardData } = useWidgetState({ openIndexPage });

  useLayoutDraft(cardData, widgetId);

  useEffect(() => {
    const wrappedHandleSelectionChange = () => {
      handleSelectionChange(proxyToWeb);
    };

    const wrappedHandleDrop = (event: DropEvent) => {
      console.log(event);
      handleDropLinks(event, proxyToWeb);

      return false;
    };

    const handleMessageFromWeb = async (message: MessageToFigma) => {
      console.log(message);

      handleAddCards(message, proxyToWeb, widgetId, process.env.VITE_WIDGET_MANIFEST_ID);
      handleClearNotification(message);
      handleDetectSelection(message, wrappedHandleSelectionChange);
      handleExportNode(message, proxyToWeb);
      handleGetViewport(message, proxyToWeb);
      handleMutation(message, proxyToWeb);
      handleRenderObject(message);
      handleRenderAutoLayoutItem(message);
      handleSearchNodesByNamePattern(message, proxyToWeb);
      handleSetSelection(message, proxyToWeb);
      handleShowNotification(message, proxyToWeb);
      handleZoomIntoViewByNames(message);
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
