import { BaseTool, ToolRunInput, ToolRunOutput } from "./base-tool";

export class FallbackTool extends BaseTool {
  name = "";
  description = "";

  constructor(private otherTools: BaseTool[]) {
    super();
  }

  public async run(input: ToolRunInput): Promise<ToolRunOutput> {
    return {
      observation: `I must only one of the provided tools [${this.otherTools.map((tool) => tool.name).join(", ")}]`,
    };
  }
}
