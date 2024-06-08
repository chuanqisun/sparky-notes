import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { replaceNotification, type ProxyToWeb } from "@h20/figma-tools";

export async function handleShowNotification(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.showNotification) return;

  const button = message.showNotification.cancelButton
    ? {
        text: message.showNotification.cancelButton?.label ?? "Cancel",
        action: () => {
          proxyToWeb.request({ abortTask: message.showNotification!.cancelButton!.handle });
        },
      }
    : undefined;

  const mergedConfig: NotificationOptions = {
    ...message.showNotification.config,
    button,
  };

  replaceNotification(message.showNotification.message, mergedConfig);
}
