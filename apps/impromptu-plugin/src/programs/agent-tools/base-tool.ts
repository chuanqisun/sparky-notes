import { getCompletion } from "../../openai/completion";
import { INTERMEDIATE_ANSWER_LENGTH } from "../agent";
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
  public async run(input: ToolRunInput): Promise<ToolRunOutput> {
    const observation = (
      await getCompletion(input.programContext.completion, input.pretext + "Observation: ", {
        max_tokens: INTERMEDIATE_ANSWER_LENGTH,
        stop: ["Thought", "Action", "Final Answer"],
      })
    ).choices[0].text.trim();
    return { observation };
  }
}
