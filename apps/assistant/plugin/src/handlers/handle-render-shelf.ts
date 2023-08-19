import type { MessageToFigma } from "@h20/assistant-types";
import { appendAsTiles, loadFonts, moveToViewCenter } from "@h20/figma-tools";
import { getNextHorizontalTilePosition, getNextVerticalTilePosition } from "@h20/figma-tools/lib/query";

export async function handleRenderShelf(message: MessageToFigma) {
  if (!message.renderShelf) return;

  await loadFonts({ family: "Inter", style: "Medium" });

  const result = renderObjectRecursively({ [message.renderShelf.name]: JSON.parse(message.renderShelf.rawData) });

  console.log(getDisplayNodes({ [message.renderShelf.name]: JSON.parse(message.renderShelf.rawData) }));

  moveToViewCenter(result);
  figma.currentPage.selection = result;
}

interface DisplaySection {
  type: "Section";
  name: string;
  children: (DisplaySection | DisplaySticky)[];
}
interface DisplaySticky {
  type: "Sticky";
  text: string;
}

function getDisplayNodes(data: any): (DisplaySection | DisplaySticky)[] {
  if (isPrimitive(data)) {
    return [
      {
        type: "Sticky",
        text: data.toString(),
      },
    ];
  }

  if (Array.isArray(data)) {
    const stickies: DisplaySticky[] = data.filter(isPrimitive).map((item) => ({
      type: "Sticky",
      text: item.toString(),
    }));

    const Sections: DisplaySection[] = data
      .filter((value) => !isPrimitive(value))
      .map((value, index) => ({
        type: "Section",
        name: index.toString(),
        children: getDisplayNodes(value),
      }));

    return [...stickies, ...Sections];
  }

  if (typeof data === "object") {
    return Object.entries(data).map(([key, value]) => ({
      type: "Section",
      name: key,
      children: getDisplayNodes(value),
    }));
  }

  return [];
}

function renderDisplayNodes(nodes: (DisplaySection | DisplaySticky)[]) {
  // TBD
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
