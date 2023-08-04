import { RunContext } from "../../main";
import { ChatMessage, OpenAIChatPayload } from "../openai/chat";
import { responseToList } from "../openai/format";

export interface GenerateReasonActInput {
  pretext: string;
  generateStepName: string;
}
export async function generateReasonAct(context: RunContext, input: GenerateReasonActInput, promptConfig?: Partial<OpenAIChatPayload>) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
You are a reason-act assistant. You will follow the logic in a chain of Thoughts, Actions, and Observations and respond with the next ${input.generateStepName}. Your response must meet all of the following criteria:
- Must be a logical next ${input.generateStepName} for the initial question, command, task, or goal
- Must respond with the prefix "${input.generateStepName}:"
- Respond inline for single item response
  - e.g. ${input.generateStepName}: <the item>
- Respond with a flat bullet list for independent ${input.generateStepName}s
  - e.g. ${input.generateStepName}: 
    - Perspective A
    - Perspective B
- Respond with a flat numbered list for sequential ${input.generateStepName}s
  - e.g. ${input.generateStepName}: 
    1. Step 1
    2. Step 2
`.trimStart(),
    },
    {
      role: "user",
      content: `
${input.pretext}

What is the next ${input.generateStepName}?`.trimStart(),
    },
  ];

  const response = await context.getChat(messages, { max_tokens: 300, ...promptConfig });

  const raw = response.choices[0].message.content.trim();
  const lines = raw.split("\n").filter(Boolean);
  const prefixMatchedLines = lines
    .map((line) => {
      const match = line.match(/^.+:/);
      return { isPrefixLine: !!match, text: match ? line.slice(match[0].length).trim() : line.trim() };
    })
    .filter(Boolean);
  const startLineIndex = prefixMatchedLines.findIndex((line) => !!line.isPrefixLine);
  const endLineIndex = prefixMatchedLines.findIndex((line, index) => !!line.isPrefixLine && index > startLineIndex);
  const keepLines = prefixMatchedLines.slice(startLineIndex, endLineIndex > -1 ? endLineIndex : undefined).map((line) => line.text);

  // TODO list parsing

  const result = keepLines.join("\n").trim();
  return responseToList(result);
}
