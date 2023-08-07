import type { MessageToFigma } from "@impromptu/types";
import type { WebMessageHandler } from "../main";
import { fq } from "../utils/fq";

export function addStickies(): WebMessageHandler {
  return (message: MessageToFigma) => {
    if (!message.addStickies) return;

    const { parentId, items } = message.addStickies;

    const newStickies = items.map((item) => {
      const sticky = figma.createSticky();
      sticky.text.characters = item.text;
      sticky.setPluginData("data", JSON.stringify(item.data));
      return sticky;
    });
    fq(newStickies).appendTo(figma.getNodeById(parentId)! as SectionNode);
  };
}
