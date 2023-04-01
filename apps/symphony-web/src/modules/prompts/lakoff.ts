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
  historyContext: HistoryContextEntry[];
  spatialContext: SpatialContextEntry[];
  direction: "Up" | "Down" | "Left" | "Right";
}

export interface SpatialContextEntry {
  subtype: string;
  input: string;
  direction?: string; // Not implemented
}

export interface HistoryContextEntry {
  id: string;
  direction: string;
  subtype: string;
  input: string;
}

export async function exploreLakoffSpace(context: RunContext, input: ExploreLakoffSpaceInput, promptConfig?: Partial<OpenAIChatPayload>) {
  const spatialContext = input.spatialContext.length
    ? `${input.spatialContext.map((entry) => `${entry.subtype} Nearby: ${entry.input}`).join("\n")}`.trim()
    : "";

  const historyContext = input.historyContext.length
    ? `
History:
${input.historyContext.map((entry) => `${entry.subtype} ${entry.direction}: ${entry.input}`).join("\n")}`.trim()
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
Thought Nearby: Your response must include Nearby information

You will be provided a history from the start to the current location and nearby Thoughts. You will use the history and nearby Thoughts to respond what the "?" is.
Your response must a Thought that is ${thoughtsMap[input.direction]}, start with the prefix "Thought ${input.direction}: ".
`.trimStart(),
    },
    {
      role: "user",
      content: `
${historyContext}
${spatialContext}
Thought ${input.direction}: ?`.trim(),
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
