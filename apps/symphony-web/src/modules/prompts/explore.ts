import { RunContext } from "../../main";
import { ChatMessage, OpenAIChatPayload } from "../openai/chat";
import { responseToList } from "../openai/format";

export interface ExploreInput {
  thoughts: string[];
}
export async function explore(context: RunContext, input: ExploreInput, promptConfig?: Partial<OpenAIChatPayload>) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        `Based on the provided Thoughts, infer the Goal if possible, and explore new Thoughts or Questions to help accomplish the Goal. Use the following format

Goal: (One sentence statement of the goal)
Thought: ...
Question: ...
(The response can have arbitrary number of Thoughts and Questions)`.trim(),
    },
    {
      role: "user",
      content: `
Thoughts:
${input.thoughts.length ? input.thoughts.map((thought) => `- ${thought}`).join("\n") : "I don't have a goal yet"}

What are the new Thoughts and Questions?`,
    },
  ];

  const response = await context.getChat(messages, { max_tokens: 300, ...promptConfig });

  const raw = response.choices[0].message.content?.trim() ?? "";

  return responseToList(raw);
}
