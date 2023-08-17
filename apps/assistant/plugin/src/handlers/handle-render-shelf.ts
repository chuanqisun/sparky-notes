import type { MessageToFigma } from "@h20/assistant-types";
import { loadFonts, moveToViewCenter } from "@h20/figma-tools";

export async function handleRenderShelf(message: MessageToFigma) {
  if (!message.renderShelf) return;

  await loadFonts({ family: "Inter", style: "Medium" });

  const sectionNode = figma.createSection();
  sectionNode.name = message.renderShelf.name;

  const sticky = figma.createSticky();
  sticky.text.characters = JSON.stringify(JSON.parse(message.renderShelf.rawData));

  sectionNode.appendChild(sticky);

  moveToViewCenter([sectionNode]);
  figma.currentPage.selection = [sectionNode];
}
