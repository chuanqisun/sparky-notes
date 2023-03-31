import { RunContext } from "../../main";
import { ChatMessage, OpenAIChatPayload } from "../openai/chat";

export interface GenerateReasonActInput {
  pretext: string;
  generateStepName: string;
}
export async function generateReasonAct(context: RunContext, input: GenerateReasonActInput, promptConfig?: Partial<OpenAIChatPayload>) {
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `
Answer the following questions as best you can.

Use the following format:

Thought: you should always think about what to do
Action: the action to take
Observation: the result of the action
... (this Thought/Action/Observation can repeat N times)

Begin!
${input.pretext}
${input.generateStepName}: `.trimStart(),
    },
  ];

  const response = await context.getChat(messages, { max_tokens: 300, ...promptConfig });

  const raw = response.choices[0].message.content.trim();
  const lines = raw.split("\n").filter(Boolean);
  const trimStartIndex = lines.findIndex((line) => line.match(/^.+:/));
  const keepLines = lines.slice(0, trimStartIndex > -1 ? trimStartIndex : undefined);

  const result = keepLines.join("\n").trim();
  return result;
}
