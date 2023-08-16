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

export interface ToolRunContext {
  shelf: any;
  args: Record<string, string>;
  setOutput: (output: any) => void;
}
