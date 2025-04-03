import type { ContentNode } from "@sticky-plus/figma-ipc-types";

export interface Tool {
  id: string;
  displayName: string;
  parameters: ToolParameter[];
  getActions: (context: ToolGetActionsContext) => string[];
  run: (context: ToolRunContextV2) => Promise<any>;
}

export interface ToolParameter {
  displayName: string;
  key: string;
  hint: string;
  isOptional?: boolean;
}

export interface ParsedShelf {
  id: string;
  name: string;
  data: any;
}

export interface ToolGetActionsContext {
  input: ContentNode[];
  previousOutput?: any;
  args: Record<string, string>;
}

export interface ToolRunContextV2 {
  input: ContentNode[];
  args: Record<string, string>;
  action: string;
}
