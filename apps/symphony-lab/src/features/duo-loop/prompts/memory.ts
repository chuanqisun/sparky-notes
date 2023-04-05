import type { AppContext } from "../../../main";
import type { ChatMessage, OpenAIChatPayload } from "../../openai/chat";

export async function observeMemory(context: AppContext, input: string, memoryEntries: string[], promptConfig?: Partial<OpenAIChatPayload>): Promise<string> {
  const probeMessages: ChatMessage[] = [
    {
      role: "system",
      content: `Simulate a research database with the following content:
${memoryEntries.length ? memoryEntries.map((entry) => `- ${entry}`).join("\n") : "(The database is empty)"}

User will provide a semantic query with natural language and you will respond with natural language. When no results are found, be more helpful and suggest what additional information user can provide.`,
    },
    {
      role: "user",
      content: `${input}`,
    },
  ];

  const observed = await context.getChat(probeMessages, { max_tokens: 200, ...promptConfig });
  if (!observed.choices[0].message.content.toLocaleLowerCase().startsWith("n/a")) {
    return observed.choices[0].message.content;
  }

  const contextRequestMessages: ChatMessage[] = [
    {
      role: "system",
      content: `Read a question and determine the most important context that is required to answer the question. Respond with one context requirement per line. Each line must start with "* "`,
    },
    {
      role: "user",
      content: input,
    },
  ];

  const contextRequest = await context.getChat(contextRequestMessages, { max_tokens: 200, ...promptConfig });
  return contextRequest.choices[0].message.content;
}
