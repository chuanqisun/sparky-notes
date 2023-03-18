import type { MessageToFigma } from "@symphony/types";
import type { InjectedContext } from "./utils/injected-runtime";

declare var context: InjectedContext;
declare var message: MessageToFigma;

async function handleMessage(context: InjectedContext, message: MessageToFigma) {
  if (message.requestGraphSelection) {
    context.selectionHandler?.(context);
  }
}

handleMessage(context, message);
