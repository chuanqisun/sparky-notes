import type { MessageToFigma } from "@h20/assistant-types";
import { appendAsTiles, loadFonts, moveToViewCenter } from "@h20/figma-tools";
import { getNextHorizontalTilePosition, getNextVerticalTilePosition } from "@h20/figma-tools/lib/query";

export async function handleRenderShelf(message: MessageToFigma) {
  if (!message.renderShelf) return;

  await loadFonts({ family: "Inter", style: "Medium" });

  const result = renderObjectRecursively({ [message.renderShelf.name]: JSON.parse(message.renderShelf.rawData) });

  moveToViewCenter(result);
  figma.currentPage.selection = result;
}

function renderObjectRecursively(data: any) {
  if (isPrimitive(data)) {
    const sticky = figma.createSticky();
    figma.currentPage.appendChild(sticky);
    sticky.text.characters = data.toString();

    return [sticky];
  } else {
    const sections = Object.entries(data).map(([key, value]) => {
      const section = figma.createSection();
      figma.currentPage.appendChild(section);
      section.name = key;

      const childNodes = renderObjectRecursively(value);
      const layoutFn = Array.isArray(data) ? getNextHorizontalTilePosition : getNextVerticalTilePosition;
      appendAsTiles(section, childNodes, layoutFn);

      return section;
    });

    return sections;
  }
}

function isPrimitive(data: any) {
  return typeof data !== "object" || data === null;
}

export interface TilingOptions {
  layoutMode: "VERTICAL" | "HORIZONTAL";
  itemSpacing: number;
}
export function createTilingContainer(options: TilingOptions) {
  const frame = figma.createFrame();
  frame.layoutMode = options.layoutMode;
  frame.itemSpacing = options.itemSpacing;

  return frame;
}
