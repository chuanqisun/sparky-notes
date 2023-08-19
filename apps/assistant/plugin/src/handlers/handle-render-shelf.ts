import type { MessageToFigma } from "@h20/assistant-types";
import { appendAsTiles, loadFonts, moveToViewCenter } from "@h20/figma-tools";
import { getNextHorizontalTilePosition, getNextVerticalTilePosition } from "@h20/figma-tools/lib/query";

export async function handleRenderShelf(message: MessageToFigma) {
  if (!message.renderShelf) return;

  await loadFonts({ family: "Inter", style: "Medium" });

  const displayNodes = getDisplayNodes({ _root: JSON.parse(message.renderShelf.rawData) });
  const renderedRoot = renderDisplayNodes(displayNodes)[0]! as SectionNode;
  const renderedItems = renderedRoot.children as SceneNode[];
  figma.ungroup(renderedRoot);

  moveToViewCenter(renderedItems);
  figma.currentPage.selection = renderedItems;
}

interface DisplaySection {
  type: "Section";
  name: string;
  children: (DisplaySection | DisplaySticky)[];
  direction: "Vertical" | "Horizontal";
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
    const { stickies, sections } = data.reduce<{
      stickies: DisplaySticky[];
      sections: DisplaySection[];
      currentIndex: 0;
    }>(
      (results, value) => {
        if (isPrimitive(value)) {
          results.stickies.push({
            type: "Sticky",
            text: value.toString(),
          });
        } else if (isNamedGroup(value)) {
          const children = getDisplayNodes(value.items);
          results.sections.push({
            type: "Section",
            name: value.name,
            children,
            direction: getDirection(children),
          });
        } else {
          const children = getDisplayNodes(value);

          results.sections.push({
            type: "Section",
            name: results.currentIndex.toString(),
            children,
            direction: getDirection(children),
          });

          results.currentIndex++;
        }

        return results;
      },
      {
        stickies: [],
        sections: [],
        currentIndex: 0,
      }
    );

    return [...stickies, ...sections];
  }

  if (typeof data === "object") {
    return Object.entries(data).map(([key, value]) => {
      const children = getDisplayNodes(value);

      return {
        type: "Section",
        name: key,
        children,
        direction: getDirection(children),
      };
    });
  }

  return [];
}

function isNamedGroup(node: any): node is {
  name: string;
  items: any[];
} {
  return typeof node.name === "string" && Array.isArray(node.items);
}

function getDirection(nodes: (DisplaySection | DisplaySticky)[]) {
  return nodes.every((node) => node.type === "Sticky") ? "Horizontal" : "Vertical";
}

function renderDisplayNodes(nodes: (DisplaySection | DisplaySticky)[]): SceneNode[] {
  const stickies = nodes.filter(isDisplaySticky).map(renderSticky);
  const sections = nodes.filter(isDisplaySection).map(renderSection);

  return [...stickies, ...sections];
}

function renderSection(node: DisplaySection): SceneNode {
  const sectionItems = renderDisplayNodes(node.children);
  const section = figma.createSection();

  section.name = node.name;
  const layoutFn = node.direction === "Horizontal" ? getNextHorizontalTilePosition : getNextVerticalTilePosition;
  appendAsTiles(section, sectionItems, layoutFn);

  return section;
}

function renderSticky(node: DisplaySticky): SceneNode {
  const sticky = figma.createSticky();
  sticky.text.characters = node.text.toString();
  return sticky;
}

function isDisplaySticky(node: DisplaySection | DisplaySticky): node is DisplaySticky {
  return node.type === "Sticky";
}
function isDisplaySection(node: DisplaySection | DisplaySticky): node is DisplaySection {
  return node.type === "Section";
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
