import { getWebProxy } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@symphony/types";
import {
  handleCreateDebugOperator,
  handleRequestUpstreamOperators,
  handleSetOperatorData,
  handleShowNotification,
  handleWebClientStarted,
  onSelectionChange,
  type HandlerContext,
} from "./handlers";
import { ensureFont } from "./utils/font";
import { showUI } from "./utils/show-ui";

const webProxy = getWebProxy<MessageToWeb, MessageToFigma>();
const fontReady = ensureFont();

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

  await fontReady;

  handleCreateDebugOperator(context, message);
  handleRequestUpstreamOperators(context, message);
  handleSetOperatorData(context, message);
  handleShowNotification(context, message);
  handleWebClientStarted(context, message);
}
