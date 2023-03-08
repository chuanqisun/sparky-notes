import { closest, filterToType } from "./query";

const getCloesetDataNode = (node: BaseNode) => closest<SectionNode>(filterToType<SectionNode>("SECTION"), node);
const filterToUniqe = function <T extends { id: string }>(node: T, index: number, array: T[]) {
  return array.findIndex((anotherNode) => anotherNode.id === node.id) === index;
};

export function getSelectedProgramNodes(isProgramNode: (node: BaseNode) => boolean) {
  const getClosestProgramNode = (node: BaseNode) => closest(isProgramNode, node);
  const programNodes = figma.currentPage.selection.map(getClosestProgramNode).filter(Boolean) as FrameNode[];
  const uniqueProgramNodes = programNodes.filter(filterToUniqe); // only keep first occurances
  return uniqueProgramNodes;
}

export function getSelectedDataNodes() {
  const dataNodes = figma.currentPage.selection.map(getCloesetDataNode).filter(Boolean) as SectionNode[];
  const uniqueDataNodes = dataNodes.filter(filterToUniqe);
  return uniqueDataNodes;
}
