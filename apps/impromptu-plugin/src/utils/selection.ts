import { closest, filterToType } from "./query";

export function getSelectedProgramNodes(isProgramNode: (node: BaseNode) => boolean) {
  const getClosestProgramNode = (node: BaseNode) => closest(isProgramNode, node);
  const programNodes = figma.currentPage.selection.map(getClosestProgramNode).filter(Boolean) as FrameNode[];
  const uniqueProgramNodes = programNodes.filter(filterToUniqe); // only keep first occurances
  return uniqueProgramNodes;
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
