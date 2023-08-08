import { getProxyToWeb } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@impromptu/types";
import { addStickies } from "./handlers/add-stickies";
import { createStep } from "./handlers/create-step";
import { selectionChanged } from "./handlers/selection-changed";
import { ensureFont } from "./utils/font";
import { showUI } from "./utils/show-ui";

const fontReady = ensureFont(); // HACK: preload the font for the entire session
const proxy = getProxyToWeb<MessageToWeb, MessageToFigma>();

async function main() {
  const handleMessageWithHandlers = handleMessage.bind(null, [addStickies(), createStep(proxy), selectionChanged(proxy)]);

  figma.on("selectionchange", () => handleMessageWithHandlers({ selectionChanged: true })); // cast figma event to message
  figma.ui.on("message", handleMessageWithHandlers);

  showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 600, width: 420 }); // timestamp for cache busting
}

main();

export interface WebMessageHandler {
  (message: MessageToFigma): void;
}

async function handleMessage(handlers: WebMessageHandler[], message: MessageToFigma) {
  await fontReady;

  handlers.forEach((handler) => handler(message));
}
