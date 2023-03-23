import type { DisplayProgram } from "@symphony/types";
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
  };
}

export function selectionNodesToDisplayPrograms(nodes: readonly SceneNode[]) {
  const programNodes = $(nodes)
    .closest((node) => node.getPluginData("type") === "programNode")
    .toNodes<FrameNode>();

  const selectedPrograms = programNodes.map(frameNodeToDisplayProgram);
  return selectedPrograms;
}
