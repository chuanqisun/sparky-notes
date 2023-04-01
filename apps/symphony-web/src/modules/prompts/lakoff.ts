import { RunContext } from "../../main";
import { ChatMessage, OpenAIChatPayload } from "../openai/chat";
import { responseToList } from "../openai/format";

export interface ExploreLakoffSpaceInput {
  center: string;
  historyContext: string;
  spatialContext: string;
  direction: "Up" | "Down" | "Left" | "Right";
}
export async function exploreLakoffSpace(context: RunContext, input: ExploreLakoffSpaceInput, promptConfig?: Partial<OpenAIChatPayload>) {
  const optionalHistoryContext = input.historyContext
    ? `
Context:
${input.historyContext}
`.trimStart()
    : "";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
You will use George Lakoff's spatial metaphor to navigate a map of Thoughts

The metaphors
Center: the current Thought
Up: be more general, increase scope, set goal
Down: be more specific, focus, divide
Left: previous, cause, before
Right: next, effect, after

The user will provide where they are and you will respond what is in the direction they are going.
Your response must start with the prefix "${input.direction}: ".
`.trimStart(),
    },
    {
      role: "user",
      content: `    
${optionalHistoryContext}
Center: ${input.center}
${input.direction}: ?`.trimStart(),
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
