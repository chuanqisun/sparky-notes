import type { WebProxy } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@impromptu/types";
import type { WebMessageHandler } from "../main";
import { fq } from "../utils/fq";

export function createStepHandler(proxy: WebProxy<MessageToWeb, MessageToFigma>): WebMessageHandler {
  return (message: MessageToFigma) => {
    if (!message.createStepReq) return;

    const createdNode = fq([figma.createSection()]).moveToViewCenter().toNodes()[0];
    proxy.respond(message, { createStepRes: createdNode.id });
  };
}
