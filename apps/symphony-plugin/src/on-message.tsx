import type { MessageToFigma } from "@symphony/types";
import type { InjectedContext } from "./main";

declare var context: any;
declare var message: MessageToFigma;

async function handleMessage(context: InjectedContext, message: MessageToFigma) {
  console.log("message", { message, context });
}

handleMessage(context, message);
