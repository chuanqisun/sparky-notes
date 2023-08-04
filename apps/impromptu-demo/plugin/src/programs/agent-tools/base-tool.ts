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
  rootQuestion: string;
}

export abstract class BaseTool {
  public abstract name: string;
  public abstract description: string;
  public async run(input: ToolRunInput): Promise<ToolRunOutput> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: [
          `Simulate an assistant to answer the question: ${input.rootQuestion}. The assistant think, act, and observe.`,
          input.pretext
            ? `
Thoughts and observations so far:
${input.pretext}
          `
            : "",
          `
Now simulate the provided action and respond with an observation. Use this format:
Simulated action: <Describe what I did>
Observation: <Describe what I observed from the action>
`,
        ]
          .map((line) => line.trim())
          .filter(Boolean)
          .join("\n\n")
          .trim(),
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
