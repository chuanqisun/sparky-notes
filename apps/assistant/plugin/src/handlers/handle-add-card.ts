import type { MessageToFigma } from "@h20/assistant-types";
import { loadFonts } from "@h20/figma-tools";

export async function handleAddCard(message: MessageToFigma, widgetId: string) {
  if (!message.addCard) return;

  await loadFonts({ family: "Inter", style: "Medium" }, { family: "Inter", style: "Semi Bold" });

  const widgetNode = figma.getNodeById(widgetId) as WidgetNode;
  const clonedWidget = widgetNode.cloneWidget({ cardData: message.addCard });

  clonedWidget.x = widgetNode.x;
  clonedWidget.y = widgetNode.y + widgetNode.height + 32;
  figma.currentPage.appendChild(clonedWidget);

  figma.notify(`✅ Card added to canvas`);
}
