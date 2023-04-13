import type { ImportTextFileConfig } from "@impromptu/types";
import type { ChatMessage, ChatProxy } from "../openai/chat";
import { responseToList } from "../openai/format";

export async function importTextFile(chatProxy: ChatProxy, config: ImportTextFileConfig): Promise<string[]> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a file converter. User will provide a ${config.type} file. You will respond with a flat unordered markdown list.`,
    },
    {
      role: "user",
      content: config.text,
    },
  ];

  console.log(messages);
  const response = await chatProxy(messages, { max_tokens: 1000, temperature: 0.25 });

  const list = responseToList(response.choices[0].message.content ?? "");

  return list.listItems;
}
