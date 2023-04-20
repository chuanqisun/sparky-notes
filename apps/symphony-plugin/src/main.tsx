import { getWebProxy } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@symphony/types";
import {
  onNotifyCreateDebugOperator,
  onSelectionChange,
  onShowNotification,
  onWebClientStarted,
  respondLinearContextGraph,
  type HandlerContext,
} from "./handlers";
import { showUI } from "./utils/show-ui";

const webProxy = getWebProxy<MessageToWeb, MessageToFigma>();

async function main() {
  figma.on("selectionchange", () => onSelectionChange({ webProxy }, figma.currentPage.selection));
  figma.ui.on("message", handleMessage);

  showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 600, width: 420 });
}

main();

async function handleMessage(message: MessageToFigma) {
  const context: HandlerContext = {
    webProxy,
  };

  onNotifyCreateDebugOperator(context, message);
  onShowNotification(context, message);
  onWebClientStarted(context, message);
  respondLinearContextGraph(context, message);
}
