import type { MessageToFigma, MessageToUI } from "@impromptu/types";
const ALLOWED_ORIGINS = ["https://www.figma.com", import.meta.env.VITE_WEB_HOST];

export const notifyFigma = sendMessage.bind(null, getParentOrigin(), import.meta.env.VITE_PLUGIN_ID);

export async function requestFigma(message: MessageToFigma) {
  const _sourceId = crypto.randomUUID();
  return new Promise<MessageToUI>((resolve) => {
    const messageHandler = (e: MessageEvent) => {
      const { _id, ...restOfMessage } = e.data.pluginMessage;
      if (_id === _sourceId) {
        window.removeEventListener("message", messageHandler);
        resolve(restOfMessage);
      }
    };

    window.addEventListener("message", messageHandler);
    notifyFigma({ ...message, _id: _sourceId } as any);
  });
}

export function respondFigma(request: MessageToUI, response: MessageToFigma) {
  notifyFigma({ ...response, _id: (request as any)._id } as any);
}

function getParentOrigin() {
  let visibleParentOrigin: string = "https://www.figma.com";
  try {
    visibleParentOrigin = window?.parent.location.origin;
  } catch {}

  const foundOrigin = ALLOWED_ORIGINS.find((origin) => origin === visibleParentOrigin);
  if (!foundOrigin) throw new Error(`Illegal origin for iframe: ${visibleParentOrigin}`);

  return foundOrigin;
}

function sendMessage(iframeHostOrigin: string, pluginId: string, message: MessageToFigma) {
  parent.postMessage({ pluginMessage: message, pluginId }, iframeHostOrigin);
}
