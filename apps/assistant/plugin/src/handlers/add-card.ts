import { loadFonts } from "@h20/figma-tools";
import { HandlerContext } from "../main";

export async function addCard({ message, widgetId }: HandlerContext) {
  if (!message.addCard) return;

  await loadFonts({ family: "Inter", style: "Medium" }, { family: "Inter", style: "Semi Bold" });

  const widgetNode = figma.getNodeById(widgetId) as WidgetNode;
  const clonedWidget = widgetNode.cloneWidget({ cardData: message.addCard });

  clonedWidget.x = widgetNode.x;
  clonedWidget.y = widgetNode.y + widgetNode.height + 32;
  figma.currentPage.appendChild(clonedWidget);

  figma.notify(`✅ Card added to canvas`);
}
