import type { DisplayProgram, LiveProgram } from "@symphony/types";
import { getFieldByLabel } from "../components/text-field";
import { $ } from "./fq";

export function frameNodeLayersToContextPath(layers: FrameNode[][]): DisplayProgram[][] {
  const contextPath = layers.map((layer) => layer.map(frameNodeToDisplayProgram));
  return contextPath;
}

export function frameNodeToDisplayProgram(node: FrameNode): DisplayProgram {
  const subtype = node.getPluginData("subtype");
  return {
    id: node.id,
    subtype,
    input: getFieldByLabel(subtype, node)!.value.characters.trim(),
    context: node.getPluginData("context"),
  };
}

export function selectionNodesToLivePrograms(nodes: readonly SceneNode[]): LiveProgram[] {
  const programNodes = $(nodes)
    .closest((node) => node.getPluginData("type") === "programNode")
    .toNodes<FrameNode>();

  const selectedPrograms = programNodes.map((node) => ({ ...frameNodeToDisplayProgram(node), isSelected: true }));
  return selectedPrograms;
}
