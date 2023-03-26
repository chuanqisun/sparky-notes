import { PrimaryDataNodeSummary } from "@impromptu/types";
import { PROGRAME_NAME_KEY } from "../programs/program";
import { getClosestColor } from "./colors";
import { getPrevNodes } from "./graph";
import { nonEmptyString } from "./non-empty-string";
import { closest, filterToHaveWidgetDataKey, filterToType, getInnerStickies } from "./query";

export function getSelectedProgramNodes(isProgramNode: (node: BaseNode) => boolean) {
  const getClosestProgramNode = (node: BaseNode) => closest(isProgramNode, node);
  const programNodes = figma.currentPage.selection.map(getClosestProgramNode).filter(Boolean) as FrameNode[];
  const uniqueProgramNodes = programNodes.filter(filterToUniqe); // only keep first occurances
  return uniqueProgramNodes;
}

export function getRunnableProgramNodeIds(programNodes: FrameNode[], dataNodes: SectionNode[]) {
  const implicitProgramNodes = dataNodes.flatMap((dataNode) => getPrevNodes(dataNode).filter(filterToHaveWidgetDataKey<FrameNode>(PROGRAME_NAME_KEY)));
  const allProgramNodeIds = [...new Set([...programNodes, ...implicitProgramNodes].map((node) => node.id))];
  return allProgramNodeIds;
}

export function getPrimaryDataNode(node: SectionNode): PrimaryDataNodeSummary | null {
  const stickies = getInnerStickies([node]);

  // sort stickies by y, then by x
  const sortedStickies = stickies.sort((a, b) => {
    if (a.y === b.y) return a.x - b.x;
    return a.y - b.y;
  });

  const colorStickies = sortedStickies.map((sticky) => {
    const fill = ((sticky.fills as Paint[])?.[0] as SolidPaint)?.color;
    const colorName = fill?.b ? getClosestColor(fill, "LightGray") : "LightGray";
    {
      return {
        text: sticky.text.characters,
        childText: nonEmptyString(sticky.getPluginData("shortContext")),
        color: colorName,
        url: (sticky.text.hyperlink as HyperlinkTarget)?.value,
      };
    }
  });

  return {
    id: node.id,
    name: node.name,
    orderedStickies: colorStickies,
  };
}

export function getSelectedStickies() {
  const stickyNodes = figma.currentPage.selection.map(getCloesetStickyNode).filter(Boolean) as StickyNode[];
  const uniqueStickyNodes = stickyNodes.filter(filterToUniqe);
  return uniqueStickyNodes;
}

export function getSelectedDataNodes() {
  const dataNodes = figma.currentPage.selection.map(getCloesetDataNode).filter(Boolean) as SectionNode[];
  const uniqueDataNodes = dataNodes.filter(filterToUniqe);
  return uniqueDataNodes;
}

export function getAllDataNodes() {
  const dataNodes = figma.currentPage.findAll(filterToType<SectionNode>("SECTION")) as SectionNode[];
  return dataNodes;
}

const getCloesetStickyNode = (node: BaseNode) => closest<StickyNode>(filterToType<StickyNode>("STICKY"), node);

const getCloesetDataNode = (node: BaseNode) => closest<SectionNode>(filterToType<SectionNode>("SECTION"), node);

const filterToUniqe = function <T extends { id: string }>(node: T, index: number, array: T[]) {
  return array.findIndex((anotherNode) => anotherNode.id === node.id) === index;
};
