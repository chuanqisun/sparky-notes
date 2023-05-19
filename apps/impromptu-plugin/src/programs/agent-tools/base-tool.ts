import { ChatMessage } from "../../openai/chat";
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
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `
User will provide an action, an input, and context. You will simulate an assistant that performs the action. Respond with an observation. Use this format:

Simulated action: <Describe what you did>
Observation: <Describe what you observed from the action>
`.trim(),
      },
      {
        role: "user",
        content: `
Action: ${input.action}
Action input: ${input.actionInput}
        `.trim(),
      },
    ];

    const observation = (await input.programContext.chat(messages, { max_tokens: 400 })).choices[0].message.content?.trim() ?? "No observation available";
    return { observation };
  }
}
