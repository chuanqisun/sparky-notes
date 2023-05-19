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
I simulate an assistant who can perform an action using the provided input. I will with an observation. Use this format:

Simulated action: <Describe what I did>
Observation: <Describe what I observed from the action>
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

    const rawResponse = (await input.programContext.chat(messages, { max_tokens: 400 })).choices[0].message.content?.trim() ?? "No observation available";
    const { observation } = parseAction(rawResponse);

    return {
      observation: observation ? observation : "No observation available, try something else.",
    };
  }
}

function parseAction(rawResponse: string) {
  const observation = rawResponse.match(/Observation: (.*)/im)?.[1].trim();
  return {
    observation,
  };
}
