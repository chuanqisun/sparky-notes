import type { MessageToFigma, MessageToWeb } from "@sparky-notes/figma-ipc-types";
import { getProxyToWeb, type ProxyToWeb } from "@sparky-notes/figma-tools";
import WidgetLogo from "./assets/Logo.svg";
import { handleClearNotification } from "./handlers/handle-clear-notification";
import { handleDetectSelection } from "./handlers/handle-detect-selection";
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
const { useEffect, SVG } = widget;

const proxyToWeb = getProxyToWeb<MessageToWeb, MessageToFigma>();

function Widget() {

  useEffect(() => {
    const wrappedHandleSelectionChange = () => {
      handleSelectionChange(proxyToWeb);
    };

    const handleMessageFromWeb = async (message: MessageToFigma) => {
      console.log(message);

      handleClearNotification(message);
      handleDetectSelection(message, wrappedHandleSelectionChange);
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

    return () => {
      figma.off("selectionchange", wrappedHandleSelectionChange);
    };
  });

  return (
    <SVG src={WidgetLogo} width={320} height={320} onClick={() => new Promise((_resolve) => openIndexPage())} />
  );
}

widget.register(Widget);

export interface HandlerContext {
  message: MessageToFigma;
  widgetId: string;
  webProxy: ProxyToWeb<MessageToWeb, MessageToFigma>;
}
