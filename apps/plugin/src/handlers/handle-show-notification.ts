import type { MessageToFigma, MessageToWeb } from "@sticky-plus/figma-ipc-types";
import { replaceNotification, type ProxyToWeb } from "@sticky-plus/figma-tools";

export async function handleShowNotification(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.showNotification) return;

  const buttons: { text: string; action: () => void }[] = [];

  if (message.showNotification.cancelButton?.handle) {
    buttons.push({
      text: message.showNotification.cancelButton.label ?? "Cancel",
      action: () => {
        if (message.showNotification?.cancelButton!.handle) {
          proxyToWeb.request({ abortTask: message.showNotification.cancelButton.handle });
        }
      },
    });
  } else if (message.showNotification.locateButton?.ids.length) {
    buttons.push({
      text: message.showNotification.locateButton.label ?? "Locate",
      action: () => {
        Promise.all(message.showNotification!.locateButton!.ids.map((id) => figma.getNodeByIdAsync(id)))
          .then((nodes) => nodes.filter((node) => node !== null))
          .then((validNodes) => figma.viewport.scrollAndZoomIntoView(validNodes as BaseNode[]));
      },
    });
  }

  const mergedConfig: NotificationOptions = {
    ...message.showNotification.config,
    button: buttons[0],
  };

  replaceNotification(message.showNotification.message, mergedConfig);
}
