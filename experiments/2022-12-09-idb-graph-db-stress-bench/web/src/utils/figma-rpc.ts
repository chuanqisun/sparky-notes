import type { MessageToMain } from "@h20/types";

const ALLOWED_ORIGINS = ["https://www.figma.com", import.meta.env.VITE_WEB_HOST];

export function getParentOrigin() {
  let visibleParentOrigin: string = "https://www.figma.com";
  try {
    visibleParentOrigin = window?.parent.location.origin;
  } catch {}

  const foundOrigin = ALLOWED_ORIGINS.find((origin) => origin === visibleParentOrigin);
  if (!foundOrigin) throw new Error(`Illegal origin for iframe: ${visibleParentOrigin}`);

  return foundOrigin;
}

export function sendMessage(iframeHostOrigin: string, pluginId: string, message: MessageToMain) {
  parent.postMessage({ pluginMessage: message, pluginId }, iframeHostOrigin);
}
