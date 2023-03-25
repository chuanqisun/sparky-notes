import { ArxivSearchProxy } from "../arxiv/search";
import { SearchProxy } from "../hits/proxy";
import { CompletionProxy } from "../openai/completion";
import { WebCrawlProxy } from "../web/crawl";
import { WebSearchProxy } from "../web/search";

export interface ProgramContext {
  arxivSearch: ArxivSearchProxy;
  completion: CompletionProxy;
  hitsSearch: SearchProxy;
  webCrawl: WebCrawlProxy;
  webSearch: WebSearchProxy;
  isAborted: () => boolean;
  isChanged: () => boolean;
  sourceNodes: SectionNode[];
}

export interface ReflectionContext {
  completion: CompletionProxy;
}

export interface Program {
  name: string;
  getSummary: (node: FrameNode) => string;
  getMethodology: (context: ReflectionContext, node: FrameNode) => string | Promise<string>;
  create: (context: CreationContext) => Promise<ProgramView>;
  run: (context: ProgramContext, node: FrameNode) => Promise<void>;
}

export interface CreationContext {
  selectedOutputNodes: SectionNode[];
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
