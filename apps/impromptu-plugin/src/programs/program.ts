import { SearchProxy } from "../hits/proxy";
import { CompletionProxy } from "../openai/completion";

export interface ProgramContext {
  completion: CompletionProxy;
  hitsSearch: SearchProxy;
  isAborted: () => boolean;
  sourceNodes: SectionNode[];
}
export interface Program {
  name: string;
  getSummary: (node: FrameNode) => string;
  onEdit?: (node: FrameNode) => any;
  create: () => Promise<ProgramView>;
  run: (context: ProgramContext, node: FrameNode) => Promise<void>;
}

export interface ProgramView {
  programNode: FrameNode;
  sourceNodes: SectionNode[];
  targetNodes: SectionNode[];
}

export function filterToProgramNode(node: BaseNode): node is FrameNode {
  return node.type === "FRAME" && node.getPluginDataKeys().includes(PROGRAME_NAME_KEY);
}

export function findMatchedProgram(programs: Program[], node: BaseNode) {
  return programs.find((program) => program.name === node.getPluginData(PROGRAME_NAME_KEY)) ?? null;
}

export const PROGRAME_NAME_KEY = "programName";
