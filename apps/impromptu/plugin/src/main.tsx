import { proxyToWeb } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@impromptu/types";
import { ensureFont } from "./utils/font";
import { showUI } from "./utils/show-ui";

const webProxy = proxyToWeb<MessageToWeb, MessageToFigma>();
const fontReady = ensureFont();

async function main() {
  figma.on("selectionchange", () => handleMessage({ selectionChanged: true })); // cast figma event to message
  figma.ui.on("message", handleMessage);

  showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 600, width: 420 }); // timestamp for cache busting
}

main();

async function handleMessage(message: MessageToFigma) {
  await fontReady;
}
