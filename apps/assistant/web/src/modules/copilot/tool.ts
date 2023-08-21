export interface Tool {
  id: string;
  displayName: string;
  parameters: ToolParameter[];
  run: (context: ToolRunContext) => void;
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

export interface ToolRunContext {
  shelf: ParsedShelf;
  args: Record<string, string>;
  update: (updateFn: (prev: ParsedShelf) => ParsedShelf) => Promise<void>;
}
