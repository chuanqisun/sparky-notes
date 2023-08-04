import type { MessageToFigma } from "@impromptu/types";
import type { WebMessageHandler } from "../main";
import { fq } from "../utils/fq";

export function createStepHandler(): WebMessageHandler {
  return (message: MessageToFigma) => {
    if (!message.createStep) return;

    console.log("Will create");
    fq([figma.createSection()]).moveToViewCenter();
  };
}
