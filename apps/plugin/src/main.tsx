import type { MessageToFigma, MessageToWeb } from "@sticky-plus/figma-ipc-types";
import { getProxyToWeb, type ProxyToWeb } from "@sticky-plus/figma-tools";
import WidgetLogo from "./assets/Prompt.svg";
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
import { openIndexPage } from "./router/router";

const { widget } = figma;
const { useEffect, useWidgetNodeId, SVG } = widget;

const proxyToWeb = getProxyToWeb<MessageToWeb, MessageToFigma>();

function Widget() {
  const widgetId = useWidgetNodeId();



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

  return (
    <SVG src={WidgetLogo} width={436} height={436} onClick={() => new Promise((_resolve) => openIndexPage())} />
  );
}

widget.register(Widget);

export interface HandlerContext {
  message: MessageToFigma;
  widgetId: string;
  webProxy: ProxyToWeb<MessageToWeb, MessageToFigma>;
}
