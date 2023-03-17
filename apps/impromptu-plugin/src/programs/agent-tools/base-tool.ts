import { ProgramContext } from "../program";

export interface ToolRunOutput {
  observation: string;
}

export interface ToolRunInput {
  action: string;
  actionInput: string;
  programContext: ProgramContext;
  pretext: string;
}

export abstract class BaseTool {
  public abstract name: string;
  public abstract description: string;
  public abstract run(input: ToolRunInput): Promise<ToolRunOutput>;
}
