import type { MessageToFigma } from "@h20/assistant-types";
import { loadFonts, moveToViewCenter } from "@h20/figma-tools";

export async function handleCreateShelf(message: MessageToFigma) {
  if (!message.createShelf) return;

  await loadFonts({ family: "Inter", style: "Medium" });

  const shapeNode = figma.createShapeWithText();
  shapeNode.shapeType = "SQUARE";
  shapeNode.resize(320, 200);
  shapeNode.text.characters = message.createShelf.name;
  shapeNode.setPluginData("shelfData", message.createShelf.rawData);

  moveToViewCenter([shapeNode]);
  figma.currentPage.selection = [shapeNode];
}
