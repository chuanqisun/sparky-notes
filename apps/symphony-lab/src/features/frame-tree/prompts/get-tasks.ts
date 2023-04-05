import type { AppContext } from "../../../main";
import type { ChatMessage, OpenAIChatPayload } from "../../openai/chat";
import { responseToArray } from "../../openai/format";
import type { Frame } from "../frame-tree";

export async function goalToTaskFrames(context: AppContext, input: string, promptConfig?: Partial<OpenAIChatPayload>): Promise<Frame[]> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Infer the tasks required to achieve the goal. Respond with one task per line, up to three lines. Each line must start with a bullet point "* "`,
    },
    {
      role: "user",
      content: input,
    },
  ];
  const response = await context.getChat(messages, { max_tokens: 200, ...promptConfig });
  const resultList = responseToArray(response.choices[0].message.content);
  return resultList.map((item) => ({ id: crypto.randomUUID(), goal: item, children: [] }));
}
