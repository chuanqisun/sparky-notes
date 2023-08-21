import type { MessageToFigma } from "@h20/assistant-types";

export async function handleUpdateShelf(message: MessageToFigma) {
  if (!message.updateShelf) return;

  const shelfNode = figma.getNodeById(message.updateShelf.id) as ShapeWithTextNode;
  if (!shelfNode) return;

  const { name, rawData } = message.updateShelf;
  if (name !== undefined) {
    shelfNode.text.characters = name;
  }

  if (rawData !== undefined) {
    shelfNode.setPluginData("shelfData", rawData);
  }
}
