import type { MessageToMain } from "@h20/types";

export function sendMessage(iframeHostOrigin: string, pluginId: string, message: MessageToMain) {
  parent.postMessage({ pluginMessage: message, pluginId }, iframeHostOrigin);
}
