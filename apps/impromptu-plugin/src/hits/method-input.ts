import { PROGRAME_NAME_KEY } from "../programs/program";
import { getNextNodes, getPrevNodes } from "../utils/graph";
import { filterToHaveWidgetDataKey, filterToType } from "../utils/query";

export function getMethodInputName(node: FrameNode): string {
  const prevDataNodes = getPrevNodes(node).filter(filterToType<SectionNode>("SECTION"));

  const prevProgramNodes = prevDataNodes.flatMap((prevDataNode) => getPrevNodes(prevDataNode).filter(filterToHaveWidgetDataKey<FrameNode>(PROGRAME_NAME_KEY)));
  const prevProgramAllDataNodes = prevProgramNodes.flatMap((programNode) => getNextNodes(programNode).filter(filterToType<SectionNode>("SECTION")));

  return [
    ...new Set(
      prevDataNodes.map((node) => (prevProgramAllDataNodes.includes(node) ? getBestIntermediateInputName(node.name) : getBestNewInputName(node.name)))
    ),
  ].join(" and ");
}

function getBestIntermediateInputName(name: string) {
  const normalized = name.toLowerCase();
  if (normalized === "output") return "previous output";
  if (normalized === "input") return "previous output";
  if (normalized === "yes") return "previous output";
  if (normalized === "no") return "negative results from the Yes/No question";

  return `"${name}" group`;
}

function getBestNewInputName(name: string) {
  const normalized = name.toLowerCase();
  if (normalized === "input") return "new input";
}
