import { BaseTool, ToolRunInput, ToolRunOutput } from "./base-tool";

export class CatchAllTool extends BaseTool {
  name = ""; // this should match any input as a valid substring
  description = "";

  constructor(private otherToolNames: string[]) {
    super();
  }

  public async run(input: ToolRunInput): Promise<ToolRunOutput> {
    return {
      observation: `I must only one of the provided tools [${this.otherToolNames.join(", ")}]`,
    };
  }
}
