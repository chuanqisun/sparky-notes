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
  direction: "vertical" | "horizontal";
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
        direction: "horizontal",
      }));

    return [...stickies, ...Sections];
  }

  if (typeof data === "object") {
    return Object.entries(data).map(([key, value]) => ({
      type: "Section",
      name: key,
      children: getDisplayNodes(value),
      direction: "vertical",
    }));
  }

  return [];
}

function renderDisplayNodes(nodes: (DisplaySection | DisplaySticky)[]) {
  const stickies = nodes.filter((node) => node.type === "Sticky");
}

function renderStiky(node: DisplaySticky) {
  const sticky = figma.createSticky();
  sticky.text.characters = node.text.toString();

  return sticky;
}

function renderObjectRecursively(data: any) {
  if (isPrimitive(data)) {
    const sticky = figma.createSticky();
    sticky.text.characters = data.toString();

    return [sticky];
  } else {
    const sections = Object.entries(data).map(([key, value]) => {
      const section = figma.createSection();
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
