import type { SelectedProgram } from "@symphony/types";
import { getFieldByLabel } from "../components/text-field";

export function frameNodeLayersToContextPath(layers: FrameNode[][]): SelectedProgram[][] {
  const contextPath = layers.map((layer) => layer.map(frameNodeToProgramNode));
  return contextPath;
}

export function frameNodeToProgramNode(node: FrameNode): SelectedProgram {
  const subtype = node.getPluginData("subtype");
  return {
    id: node.id,
    subtype,
    input: getFieldByLabel(subtype, node)!.value.characters.trim(),
  };
}
