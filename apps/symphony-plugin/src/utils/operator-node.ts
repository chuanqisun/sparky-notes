import type { OperatorNode } from "@symphony/types";
import { getFieldByLabel } from "../components/text-field";
import { $ } from "./fq";

export function frameNodeToOperatorNode(node: FrameNode): OperatorNode {
  const subtype = node.getPluginData("subtype");
  const data = JSON.parse(node.getPluginData("data"));
  return {
    id: node.id,
    name: subtype,
    config: JSON.parse(getFieldByLabel("Config", node)!.value.characters.trim()),
    data,
  };
}

export function selectionToOperatorNodes(nodes: readonly SceneNode[]): OperatorNode[] {
  const programNodes = $(nodes)
    .closest((node) => node.getPluginData("type") === "operator")
    .toNodes<FrameNode>();

  const selectedPrograms = programNodes.map((node) => ({ ...frameNodeToOperatorNode(node), isSelected: true }));
  return selectedPrograms;
}
