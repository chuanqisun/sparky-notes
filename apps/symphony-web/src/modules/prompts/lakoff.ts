import { RunContext } from "../../main";
import { ChatMessage, OpenAIChatPayload } from "../openai/chat";
import { responseToList } from "../openai/format";

const thoughtsMap = {
  Up: "more general, broader, abstract, theoretic",
  Down: "more specific, focused, concrete, practical",
  Left: "previous, cause, before, assumption",
  Right: "next, effect, after, conclusion",
};

export interface ExploreLakoffSpaceInput {
  center: string;
  historyContext: string;
  spatialContext: string;
  direction: "Up" | "Down" | "Left" | "Right";
}
export async function exploreLakoffSpace(context: RunContext, input: ExploreLakoffSpaceInput, promptConfig?: Partial<OpenAIChatPayload>) {
  const parsedHistoryEntries: { id: string; direction: string; subtype: string; input: string }[] = (() => {
    try {
      return JSON.parse(input.historyContext);
    } catch {
      return [];
    }
  })();

  const parsedHistory = parsedHistoryEntries.length
    ? `
History:
${parsedHistoryEntries.map((entry) => `${entry.subtype} ${entry.direction}: ${entry.input}`).join("\n")}`.trim()
    : "";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
You will use George Lakoff's spatial metaphor to navigate a map of Thoughts

The metaphors
Thought Up: ${thoughtsMap["Up"]}
Thought Down: ${thoughtsMap["Down"]}
Thought Left: ${thoughtsMap["Left"]}
Thought Right: ${thoughtsMap["Right"]}

You will be provided a history from the start to the current location and other nearby Thoughts. You will use the history and nearby Thoughts to respond what the "?" is.
Your response must a Thought that is ${thoughtsMap[input.direction]}, start with the prefix "Thought ${input.direction}: ".
`.trimStart(),
    },
    {
      role: "user",
      content: `    
${parsedHistory}
Thought ${input.direction}: ?`.trimStart(),
    },
  ];

  const response = await context.getChat(messages, { max_tokens: 300, ...promptConfig });

  const raw = response.choices[0].message.content.trim();
  const lines = raw.split("\n").filter(Boolean);
  const prefixMatchedLines = lines
    .map((line) => {
      const match = line.match(/^.+:/);
      return { isPrefixLine: !!match, text: match ? line.replace(/^.+:/, "").trim() : line.trim() };
    })
    .filter(Boolean);
  const startLineIndex = prefixMatchedLines.findIndex((line) => !!line.isPrefixLine);
  const endLineIndex = prefixMatchedLines.findIndex((line, index) => !!line.isPrefixLine && index > startLineIndex);
  const keepLines = prefixMatchedLines.slice(startLineIndex, endLineIndex > -1 ? endLineIndex : undefined).map((line) => line.text);

  // TODO list parsing

  const result = keepLines.join("\n").trim();
  return responseToList(result);
}
