import { notifyFigma } from "../figma/rpc";

export async function updateRuntime() {
  const [messageHandlerString, selectionHandlerString] = await Promise.all([
    import("@symphony/figma/dist/on-message.js?raw").then((f) => f.default),
    import("@symphony/figma/dist/on-selection.js?raw").then((f) => f.default),
  ]);

  notifyFigma({
    injectMessageHandler: messageHandlerString,
    injectSelectionHandler: selectionHandlerString,
  });
}
