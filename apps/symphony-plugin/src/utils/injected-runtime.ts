import type { MessageToFigma } from "@symphony/types";
import { respondUI } from "./rpc";

export type InjectedContext = {
  selectionHandler?: (context: InjectedContext) => any;
  messageHandler?: (context: InjectedContext, message: MessageToFigma) => any;
};

let injectedMessageHandler: any;
let injectedSelectionChangeHandler: any;
let injectedContext: InjectedContext = {};

function resetContext() {
  for (const x in injectedContext) if (injectedContext.hasOwnProperty(x)) delete (injectedContext as any)[x];
}

async function bootstrapHandler(message: MessageToFigma) {
  console.log("[widget] received message", message);
  if (message.requestRuntimeUpdate) {
    resetContext();

    figma.ui.off("message", injectedMessageHandler);
    injectedMessageHandler = new Function("context", "message", message.requestRuntimeUpdate!.messageHandler).bind(null, injectedContext);
    injectedContext.messageHandler = injectedMessageHandler;
    figma.ui.on("message", injectedMessageHandler as any);

    figma.off("selectionchange", injectedSelectionChangeHandler);
    injectedSelectionChangeHandler = new Function("context", "message", message.requestRuntimeUpdate!.selectionHandler).bind(null, injectedContext);
    injectedContext.selectionHandler = injectedSelectionChangeHandler;
    figma.on("selectionchange", injectedSelectionChangeHandler as any);

    respondUI(message, { respondRuntimeUpdate: true });
  }
}

export function useInjectedRuntime() {
  figma.widget.useEffect(() => {
    figma.ui.on("message", bootstrapHandler);
  });
}
