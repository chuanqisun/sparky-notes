export function sendMessage(pluginId: string, message: any) {
  parent.postMessage({ pluginMessage: message, pluginId }, "https://www.figma.com");
}
